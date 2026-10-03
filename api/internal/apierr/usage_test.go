package apierr_test

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"path/filepath"
	"strings"
	"testing"
)

// apiModuleRoot is the api module root relative to this package's own
// directory -- what every AST guardrail in this package walks.
const apiModuleRoot = "../.."

// walkProductionFiles parses every production Go file under root -- the
// whole api module, package main's route wiring included -- and hands
// each one's module-relative path and parsed syntax tree to visit. Test
// files are excluded: the three guardrails below all police what reaches
// a caller over HTTP, and a test file reaches nobody.
//
// One walk for every AST guardrail in this package, so a fix to the skip
// rules is made once.
func walkProductionFiles(root string, visit func(rel string, fset *token.FileSet, file *ast.File)) error {
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return fmt.Errorf("rel %s: %w", path, err)
		}

		fset := token.NewFileSet()
		file, err := parser.ParseFile(fset, path, nil, 0)
		if err != nil {
			return fmt.Errorf("parse %s: %w", path, err)
		}
		visit(rel, fset, file)
		return nil
	})
	if err != nil {
		// coverage:ignore reason: a filesystem walk failure over the module's own source, not reachable from a test
		return fmt.Errorf("walk %s: %w", root, err)
	}
	return nil
}

// TestNoDirectHTTPError walks every production source file in the api
// module (package main's route wiring included, not just api/internal)
// and fails if any code outside this package calls http.Error directly
// instead of Write or WriteError. Test files are excluded: they reach no
// caller over HTTP.
func TestNoDirectHTTPError(t *testing.T) {
	root := apiModuleRoot

	var offenses []string
	err := walkProductionFiles(root, func(rel string, fset *token.FileSet, file *ast.File) {
		if strings.HasPrefix(rel, filepath.Join("internal", apierrPackage)+string(filepath.Separator)) {
			return
		}

		ast.Inspect(file, func(n ast.Node) bool {
			call, ok := n.(*ast.CallExpr)
			if !ok {
				return true
			}
			sel, ok := call.Fun.(*ast.SelectorExpr)
			if !ok {
				return true
			}
			ident, ok := sel.X.(*ast.Ident)
			if !ok || ident.Name != "http" || sel.Sel.Name != "Error" {
				return true
			}
			offenses = append(offenses, rel+":"+fset.Position(call.Pos()).String())
			return true
		})
	})
	if err != nil {
		t.Fatalf("walk api module: %v", err)
	}

	if len(offenses) > 0 {
		t.Fatalf("http.Error called directly instead of apierr.Write/WriteError:\n%s",
			strings.Join(offenses, "\n"))
	}
}

// isJSONEnvelopePackage reports whether rel names a file in one of the
// two packages allowed to touch the section 7 envelope's JSON directly:
// apierr, the one writer of it, and apierrtest, the one reader of it in
// a test. Only the JSON walk below skips these; the http.Error walk
// skips apierr alone.
func isJSONEnvelopePackage(rel string) bool {
	for _, pkg := range []string{apierrPackage, apierrTestPackage} {
		if strings.HasPrefix(rel, filepath.Join("internal", pkg)+string(filepath.Separator)) {
			return true
		}
	}
	return false
}

// jsonUsageExceptions is the audited list of production files that may
// encode or decode JSON outside apierr, because what they do is not a
// fresh JSON encode or decode of a request or response (an idempotent
// replay of stored bytes, say). It is empty today. A new match is a
// regression to fix, not a file to add here, unless the PR that adds the
// entry gives the reason.
var jsonUsageExceptions = map[string]bool{}

// TestNoDirectJSONUsage extends TestNoDirectHTTPError to success bodies:
// a handler outside apierr that sets the JSON Content-Type, encodes with
// json.NewEncoder, or decodes with json.NewDecoder does apierr.WriteJSON
// or DecodeJSON's job a second time.
func TestNoDirectJSONUsage(t *testing.T) {
	root := apiModuleRoot

	var offenses []string
	err := walkProductionFiles(root, func(rel string, fset *token.FileSet, file *ast.File) {
		if isJSONEnvelopePackage(rel) || jsonUsageExceptions[rel] {
			return
		}

		ast.Inspect(file, func(n ast.Node) bool {
			call, ok := n.(*ast.CallExpr)
			if !ok {
				return true
			}
			sel, ok := call.Fun.(*ast.SelectorExpr)
			if !ok {
				return true
			}

			// json.NewEncoder(...) / json.NewDecoder(...)
			if ident, ok := sel.X.(*ast.Ident); ok && ident.Name == "json" &&
				(sel.Sel.Name == "NewEncoder" || sel.Sel.Name == "NewDecoder") {
				offenses = append(offenses, rel+":"+fset.Position(call.Pos()).String()+": json."+sel.Sel.Name)
				return true
			}

			// anything.Header().Set("Content-Type", "application/json") --
			// a response header. sel.X must itself be a call (Header()),
			// which is what distinguishes a ResponseWriter's header from
			// an outgoing http.Request's Header field (req.Header.Set,
			// a field access with no call in between, e.g.
			// sitebuild.GitHubDispatcher building an outbound request).
			if _, isCall := sel.X.(*ast.CallExpr); sel.Sel.Name == "Set" && isCall && len(call.Args) == 2 {
				key, ok := call.Args[0].(*ast.BasicLit)
				if !ok || key.Kind != token.STRING || key.Value != `"Content-Type"` {
					return true
				}
				value, ok := call.Args[1].(*ast.BasicLit)
				if !ok || value.Kind != token.STRING || value.Value != `"application/json"` {
					return true
				}
				offenses = append(offenses, rel+":"+fset.Position(call.Pos()).String()+": Content-Type: application/json")
			}
			return true
		})
	})
	if err != nil {
		t.Fatalf("walk api module: %v", err)
	}

	if len(offenses) > 0 {
		t.Fatalf("JSON encode/decode/Content-Type set outside apierr.WriteJSON/DecodeJSON:\n%s",
			strings.Join(offenses, "\n"))
	}
}

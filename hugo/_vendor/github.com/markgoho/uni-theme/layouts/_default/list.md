{{- /* list.md (uni-theme#41): the Markdown twin of list.html. Title,
  description, the section's own body, then one link per child page --
  to its `markdown` twin when it has one, else its HTML page
  (llms/page-url.md). */ -}}
# {{ .Title }}
{{ with .Description }}
{{ . }}
{{ end }}
{{- with partial "text/markdown-body.md" . }}
{{ . }}
{{ end }}
{{ range .Pages.ByTitle }}
- [{{ .Title }}]({{ partial "llms/page-url.md" . }}){{ with .Description }}: {{ . }}{{ end }}
{{- end }}

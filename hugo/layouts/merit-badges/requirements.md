{{- /* Markdown twin of requirements.html (mbu#328): the same nodes
  (merit-badges/requirement-nodes.html) through uni-theme's
  text/requirements.md, so the two pages cannot drift. No HTML and no
  "{{" may reach the output (scripts/check-llm-text.ts). */ -}}
{{- $badge := .Parent -}}
{{- $json := index hugo.Data "merit-badges" (path.Base $badge.File.Dir) -}}
# {{ .Title }}

{{ partial "merit-badges/badge-facts.md" (dict "json" $json "badge" $badge "page" .) }}
{{ with .Description }}
{{ . }}
{{ end }}
## Requirements

{{ partial "text/requirements.md" (dict "nodes" (partial "merit-badges/requirement-nodes.html" (dict "json" $json "guide" ($badge.GetPage "guide")))) }}

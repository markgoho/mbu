{{- /* Markdown twin of badge-landing.html (mbu#328): the badge facts
  and the top-level requirements, with links to the full requirements
  and the guide. No HTML and no "{{" may reach the output
  (scripts/check-llm-text.ts). */ -}}
{{- $slug := path.Base .File.Dir -}}
{{- $json := index hugo.Data "merit-badges" $slug -}}
# {{ .Title }}

{{ partial "merit-badges/badge-facts.md" (dict "json" $json "badge" . "page" .) }}
{{ with .GetPage "requirements" }}{{ with .Description }}
{{ . }}
{{ end }}{{ end }}

{{- /* llms/sections.md (uni-theme#40). Hook: the H2 sections of
  llms.txt. A consumer overrides this file with its own lists (mbu: merit
  badges; scouting-u: ranks). This default lists the home page's
  top-level sections, each linked through llms/page-url.md, and writes
  nothing when there are none.

  Context: the home Page. Output: Markdown, starting with "## ". */ -}}
{{ with .Sections -}}
## Sections
{{ range . }}
- [{{ .Title }}]({{ partial "llms/page-url.md" . }}){{ with .Description }}: {{ . }}{{ end }}
{{- end }}
{{ end -}}

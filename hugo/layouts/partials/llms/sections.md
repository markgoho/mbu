{{- /* llms/sections.md: overrides uni-theme's hook (mbu#327). The H2
  sections of llms.txt. Each badge links to its requirements .md twin,
  which links on to the badge overview and its guide. Context: the home
  Page. Output: Markdown, no HTML. */ -}}
{{- $badges := partial "llms/badges.html" . -}}
## Merit Badges
{{ range $badges.current }}
{{- $note := "" }}
{{- if .json.eagle_group }}{{ $note = printf ": Eagle-required (one choice in the %s group)" .json.eagle_group }}{{ else if .json.eagle_required }}{{ $note = ": Eagle-required" }}{{ end }}
- [{{ .name }}]({{ partial "llms/page-url.md" (.page.GetPage "requirements") }}){{ $note }}
{{- end }}

## Guides
{{ with site.GetPage "/merit-badges/eagle-required/strategy" }}
- [{{ .Title }}]({{ partial "llms/page-url.md" . }}): when to start each Eagle-required badge, 90-day time locks, and the choice groups
{{- end }}
{{- with site.GetPage "/merit-badges/eagle-required" }}
- [{{ .Title }}]({{ partial "llms/page-url.md" . }}): the 14 badges a Scout needs for Eagle Scout, with the three choice groups
{{- end }}

## Optional
{{ range $badges.discontinued }}
- [{{ .name }}]({{ partial "llms/page-url.md" (.page.GetPage "requirements") }}): discontinued{{ with .json.discontinued_date }} {{ (time .).Format "January 2, 2006" }}{{ end }}
{{- end }}
{{- with site.GetPage "/categories" }}
- [Merit badge categories]({{ partial "llms/page-url.md" . }}): badges grouped by category
{{- end }}
{{- with site.GetPage "/search" }}
- [{{ .Title }}]({{ partial "llms/page-url.md" . }}): full-text search across all badge requirements
{{- end }}

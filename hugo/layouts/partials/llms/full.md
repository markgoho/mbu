{{- /* llms/full.md: overrides uni-theme's hook (mbu#331). The body of
  llms-full.txt: one "## <badge>" section per badge with its facts and
  its requirements, built from the same nodes as the requirements page
  (merit-badges/requirement-nodes.html through text/requirements.md).
  Discontinued badges come last. Context: the home Page. Output:
  Markdown, no HTML. */ -}}
{{- $badges := partial "llms/badges.html" . -}}
{{- $sections := slice -}}
{{- range $badges.current -}}
  {{- $sections = $sections | append (partial "llms/badge-full.md" (dict "badge" . "page" $)) -}}
{{- end -}}
{{- with $badges.discontinued -}}
  {{- $sections = $sections | append "## Discontinued merit badges\n\nScouting America discontinued the badges below. Their requirements stay here for Scouts who started them before the discontinuation date." -}}
  {{- range . -}}
    {{- $sections = $sections | append (partial "llms/badge-full.md" (dict "badge" . "page" $)) -}}
  {{- end -}}
{{- end -}}
{{- delimit $sections "\n\n" }}

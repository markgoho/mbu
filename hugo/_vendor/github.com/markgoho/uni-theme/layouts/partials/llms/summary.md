{{- /* llms/summary.md (uni-theme#40). Returns the one-sentence site
  summary for the llms.txt / llms-full.txt blockquote:
  params.llms.summary, else params.theme.tagline, else "". */ -}}
{{- return (site.Params.llms.summary | default site.Params.theme.tagline | default "") -}}

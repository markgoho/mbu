{{- /* llms/page-url.md (uni-theme#40). Returns the absolute URL an LLM
  should read for a page: its `markdown` twin when the page outputs one,
  else its HTML permalink. For a consumer's llms/sections.md and
  llms/full.md hooks.

  Params: a Page. */ -}}
{{- $url := .Permalink -}}
{{- with .OutputFormats.Get "markdown" }}{{ $url = .Permalink }}{{ end -}}
{{- return $url -}}

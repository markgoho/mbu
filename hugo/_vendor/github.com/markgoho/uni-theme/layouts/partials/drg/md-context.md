{{- /* drg/md-context.md (uni-theme#41)

  Hook: the context line(s) a guide page's Markdown twin writes right
  after its H1, so an LLM that fetches one guide .md alone can tell which
  award it is about. Override it for a site-specific wording (mbu: the
  badge name and the guide index's lead).

  Default: reads identity.title (page, else section, else parent -- as
  guide.html does). On a guide page: "Part of the <title> guide:
  [<section title>](<section .md twin or HTML URL>)". On the guide index:
  "The <title> guide." Writes nothing when no identity title is set.

  Params: the guide Page. Returns: a Markdown string, or "".
*/ -}}
{{- $identity := .Params.identity | default .CurrentSection.Params.identity | default .Parent.Params.identity -}}
{{- $out := "" -}}
{{- with $identity -}}
  {{- with .title -}}
    {{- if $.IsSection -}}
      {{- $out = printf "The %s guide." . -}}
    {{- else -}}
      {{- $out = printf "Part of the %s guide: [%s](%s)" . $.CurrentSection.Title (partial "llms/page-url.md" $.CurrentSection) -}}
    {{- end -}}
  {{- end -}}
{{- end -}}
{{- return $out -}}

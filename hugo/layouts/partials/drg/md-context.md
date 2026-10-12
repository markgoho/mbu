{{- /* drg/md-context.md: mbu override of the uni-theme hook (mbu#329).
  The context a guide page's Markdown twin writes after its H1, so a
  guide .md read alone names its badge. On a guide page: a link to the
  guide index. On the guide index: a link to the badge overview, then
  the lead that guide.html's hero shows (the requirements page
  description).

  Params: the guide Page. Returns: a Markdown string, or "".
*/ -}}
{{- $guide := .CurrentSection -}}
{{- $badge := $guide.Parent -}}
{{- $out := "" -}}
{{- with $badge -}}
  {{- $name := printf "%s Digital Resource Guide" .Title -}}
  {{- if $.IsSection -}}
    {{- $out = printf "The %s. Badge overview: [%s](%s)" $name .Title (partial "llms/page-url.md" .) -}}
    {{- with .GetPage "requirements" }}{{ with .Description }}{{ $out = printf "%s\n\n%s" $out . }}{{ end }}{{ end -}}
  {{- else -}}
    {{- $out = printf "Part of the %s: [%s](%s)" $name $guide.Title (partial "llms/page-url.md" $guide) -}}
  {{- end -}}
{{- end -}}
{{- return $out -}}

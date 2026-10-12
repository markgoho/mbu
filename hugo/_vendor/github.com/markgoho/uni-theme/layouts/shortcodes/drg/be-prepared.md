{{- /* Markdown variant (uni-theme#39): blockquote, label "Be Prepared!"
  plus the title. */ -}}
{{- $label := "Be Prepared!" -}}
{{- with .Get "title" }}{{ $label = printf "Be Prepared! %s" . }}{{ end -}}
{{ partial "drg/blockquote.md" (dict "label" $label "body" .Inner) }}
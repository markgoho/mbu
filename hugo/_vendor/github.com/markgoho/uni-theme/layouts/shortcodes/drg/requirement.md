{{- /* Markdown variant (uni-theme#39): blockquote with the requirement
  number in bold, the text (lead-sentence logic shared with the .html
  variant via drg/requirement-text.html) and the option in bold. Empty
  text renders nothing, as in the .html variant. */ -}}
{{- $number := .Get "number" -}}
{{- $resolved := partial "drg/requirement-text.html" (dict "page" .Page "number" $number "text" (.Inner | strings.TrimSpace)) -}}
{{- with $resolved.text -}}
  {{- $text := partial "text/markdown-text.md" (dict "text" . "text_format" ($.Get "text_format" | default "markdown")) -}}
  {{- with $.Get "option" }}{{ $text = printf "%s **%s**" $text . }}{{ end -}}
  {{- $label := cond (ne $number "") (printf "%s." $number) "" -}}
{{ partial "drg/blockquote.md" (dict "label" $label "body" $text "inline" true) }}
{{- end -}}
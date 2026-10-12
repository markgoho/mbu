{{- /* Markdown variant (uni-theme#39): blockquote with the requirement
  number in bold and the merged text (drg/inherited-text.html, shared
  with the .html variant). */ -}}
{{- $number := .Get "number" -}}
{{- $topic := .Get "topic" | default (.Inner | strings.TrimSpace) -}}
{{- $parentText := .Get "parent_text" | default (partial "drg/parent-text.html" (dict "page" .Page "number" $number "req_path" (.Get "req_path" | default ""))) | strings.TrimSpace -}}
{{- $displayText := partial "drg/inherited-text.html" (dict "topic" $topic "parent_text" $parentText) -}}
{{- $text := partial "text/markdown-text.md" (dict "text" $displayText "text_format" (.Get "text_format" | default "markdown")) -}}
{{- $label := cond (ne $number "") (printf "%s." $number) "" -}}
{{ partial "drg/blockquote.md" (dict "label" $label "body" $text "inline" true) }}
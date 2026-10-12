{{- /* Markdown variant (uni-theme#39): an inline link, same target as
  the .html variant (drg/link-target.html). */ -}}
{{- $link := partial "drg/link-target.html" . -}}
{{- $text := .Get "text" | default (.Inner | default ($link.slug | humanize | title)) -}}
[{{ strings.TrimSpace $text }}]({{ $link.url | absURL }})
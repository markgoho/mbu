{{- /* Markdown variant (uni-theme#39): "Eyebrow: [title](url)" plus the
  description, same target as the .html variant (drg/link-target.html). */ -}}
{{- $link := partial "drg/link-target.html" . -}}
{{- $eyebrow := "Related Guide" -}}
{{- if $link.is_badge -}}
  {{- $eyebrow = "Merit Badge Guide" -}}
{{- else if $link.is_rank -}}
  {{- $eyebrow = cond (eq $link.mode "requirements") "Rank Requirements" "Rank Guide" -}}
{{- end -}}
{{- $eyebrow = .Get "eyebrow" | default (.Get "badge_label" | default $eyebrow) -}}
{{- $title := .Get "title" | default ($link.slug | humanize | title) -}}
{{- $description := .Get "description" | default .Inner | strings.TrimSpace -}}
{{ $eyebrow }}: [{{ $title }}]({{ $link.url | absURL }}){{ with $description }}: {{ . }}{{ end }}
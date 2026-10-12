{{- /* Markdown variant (uni-theme#39): a link to the video URL. */ -}}
Video: [{{ .Get "title" | default (.Get "url") }}]({{ .Get "url" }})
{{- /* Markdown variant (uni-theme#39): bold title, then the details.
  The image is left out: it only decorates the card. */ -}}
**{{ .Get "title" }}**{{ with .Get "details" }}: {{ . }}{{ end }}
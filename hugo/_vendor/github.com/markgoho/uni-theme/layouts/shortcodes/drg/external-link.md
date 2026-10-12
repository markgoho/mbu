{{- /* Markdown variant (uni-theme#39): a link with its description. */ -}}
[{{ .Get "title" }}]({{ .Get "url" | absURL }}){{ with .Get "description" }}: {{ . }}{{ end }}
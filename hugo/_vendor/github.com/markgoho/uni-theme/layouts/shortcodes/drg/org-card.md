{{- /* Markdown variant (uni-theme#39): the organization as a link, with
  its description. */ -}}
[{{ .Get "name" }}]({{ .Get "url" | absURL }}){{ with .Get "description" }}: {{ . }}{{ end }}
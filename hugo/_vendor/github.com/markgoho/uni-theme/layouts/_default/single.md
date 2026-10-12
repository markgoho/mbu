{{- /* single.md (uni-theme#41): the Markdown twin of single.html. Title,
  description, then the body through .RenderShortcodes (raw Markdown,
  shortcodes rendered by their .md variants). */ -}}
# {{ .Title }}
{{ with .Description }}
{{ . }}
{{ end }}
{{ partial "text/markdown-body.md" . }}

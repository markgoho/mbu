{{- /* guide.md (uni-theme#41): the Markdown twin of guide.html, for a
  guide page that turns on the `markdown` output format.

  Writes the title, the drg/md-context.md hook (which award this guide
  is about), the group label, the description, the body through
  .RenderShortcodes (raw Markdown with each shortcode rendered by its .md
  variant, see text/markdown-body.md), and prev/next links as a list,
  each to the target's .md twin when it has one (else its absolute HTML
  URL). The group label is in italics: "1. Group" alone would parse as
  an ordered list item. A shortcode with no .md variant falls back to its .html
  output, so every shortcode a guide uses needs one. HTML comments in
  the body are removed.
*/ -}}
{{- $navData := partial "drg/resolve-nav.html" . -}}
{{- $cleanTitle := replaceRE `^(Req|Requirement) [0-9A-Za-z]+([–-][0-9A-Za-z]+)? — ` "" .Title -}}
# {{ $cleanTitle }}
{{ with partial "drg/md-context.md" . }}
{{ . }}
{{ end }}
{{- with $navData.group_title_display }}
*{{ . }}*
{{ end }}
{{- with .Description }}
{{ . }}
{{ end }}
{{ partial "text/markdown-body.md" . }}
{{ if or $navData.prev $navData.next }}
---
{{ range slice (dict "label" "Previous" "url" $navData.prev "title" ($navData.prev_title | default "Previous Page")) (dict "label" "Next" "url" $navData.next "title" ($navData.next_title | default "Next Page")) }}
{{- $item := . }}
{{- with .url }}
{{- $href := . | absURL }}
{{- with site.GetPage (strings.TrimSuffix "/" .) }}{{ $href = partial "llms/page-url.md" . }}{{ end }}
- {{ $item.label }}: [{{ $item.title }}]({{ $href }})
{{- end }}
{{- end }}
{{ end -}}

{{- /* text/markdown-body.md (uni-theme#41)

  A page's body for its Markdown twin: .RenderShortcodes (raw Markdown,
  each shortcode rendered by its .md variant; .Content would be goldmark
  HTML), with HTML comments removed and root-relative link and image
  targets ("](/path") made absolute, because an LLM reads the .md alone.

  Params: a Page. Returns: the trimmed Markdown body.
*/ -}}
{{- $body := replaceRE `(?s)<!--.*?-->` "" .RenderShortcodes -}}
{{- $base := strings.TrimSuffix "/" site.BaseURL -}}
{{- $body = replaceRE `\]\(/([^/)])` (printf "](%s/$1" $base) $body -}}
{{- return (strings.TrimSpace $body) -}}

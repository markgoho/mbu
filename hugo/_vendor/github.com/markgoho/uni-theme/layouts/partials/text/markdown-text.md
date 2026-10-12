{{/* text/markdown-text.md

  Resolves requirement text to Markdown, once, for the Markdown twins
  (text/requirements.md, the drg/requirement and drg/inherited-
  requirement .md shortcodes). The plain-text twin of text/render.html.

  "markdown" text is already Markdown and returns trimmed, unchanged.
  "html" text (a consumer's pre-rendered upstream HTML, e.g. scouting-u's
  rank JSON) is rewritten tag by tag, in this order:

  1. <sup> groups whose links point at #fn-N -> footnote refs "[^N]"
     (one per link: <sup><a href="#fn-4">4</a>, <a href="#fn-5">5</a></sup>
     -> "[^4][^5]"). A <sup> with no #fn- link keeps only its text.
  2. <a href="x">y</a> -> [y](x). A root-relative href gets the site's
     base URL, so a link still works outside the site.
  3. <ol>/<ul>/<li> -> list lines ("1. " inside an <ol>, "- " otherwise).
     Not nested: a list inside a list item flattens to one level.
  4. <br> -> newline, <p> -> blank line, <strong>/<b> -> **, <em>/<i> -> *.
  5. Every other tag is stripped, entities are decoded (htmlUnescape),
     trailing spaces are trimmed, and 3+ newlines collapse to one blank
     line.

  Params (dict):
    text        - the source text
    text_format - "markdown" | "html" (required, no default -- same rule
                  as text/render.html, see CONTRACT.md's "Text
                  utilities")

  Returns: a Markdown string with no HTML tags. Can be multi-line.
*/}}
{{ $text := .text | default "" }}
{{ $textFormat := .text_format }}
{{ if not (in (slice "markdown" "html") $textFormat) }}
  {{ errorf "text/markdown-text.md: text_format must be \"markdown\" or \"html\", got %q" $textFormat }}
{{ end }}

{{ if eq $textFormat "html" }}
  {{ range findRE `(?s)<sup[^>]*>.*?</sup>` $text }}
    {{ $refs := slice }}
    {{ range findRESubmatch `href="#fn-([^"]+)"` . }}
      {{ $refs = $refs | append (printf "[^%s]" (index . 1)) }}
    {{ end }}
    {{ $repl := cond (gt (len $refs) 0) (delimit $refs "") (replaceRE `<[^>]+>` "" .) }}
    {{ $text = replace $text . $repl }}
  {{ end }}

  {{ $base := strings.TrimSuffix "/" site.BaseURL }}
  {{ $text = replaceRE `(?s)<a\s[^>]*href="/([^"]*)"[^>]*>(.*?)</a>` (printf "[$2](%s/$1)" $base) $text }}
  {{ $text = replaceRE `(?s)<a\s[^>]*href="([^"]*)"[^>]*>(.*?)</a>` "[$2]($1)" $text }}

  {{ range findRE `(?s)<ol[^>]*>.*?</ol>` $text }}
    {{ $text = replace $text . (replaceRE `<li[^>]*>\s*` "\n1. " .) }}
  {{ end }}
  {{ $text = replaceRE `<li[^>]*>\s*` "\n- " $text }}
  {{ $text = replaceRE `</?(ul|ol)[^>]*>` "\n\n" $text }}
  {{ $text = replaceRE `<br\s*/?>` "\n" $text }}
  {{ $text = replaceRE `<p[^>]*>` "\n\n" $text }}
  {{ $text = replaceRE `(?s)<(?:strong|b)>(.*?)</(?:strong|b)>` "**$1**" $text }}
  {{ $text = replaceRE `(?s)<(?:em|i)>(.*?)</(?:em|i)>` "*$1*" $text }}
  {{ $text = replaceRE `<[^>]+>` "" $text }}
  {{ $text = htmlUnescape $text }}
  {{ $text = replaceRE `[ \t]+\n` "\n" $text }}
  {{ $text = replaceRE `\n[ \t]+` "\n" $text }}
  {{ $text = replaceRE `\n{3,}` "\n\n" $text }}
{{ end }}

{{ return (strings.TrimSpace $text) }}

{{/* text/requirements.md

  Renders a requirement tree as Markdown: the plain-text twin of
  req-card.html / req-children.html / req-child-item.html, for a
  consumer's Markdown twins and llms-full.txt (uni-theme#38). Takes the
  same node dicts (CONTRACT.md, "Requirement-rendering behavior"), so
  the HTML page and its Markdown twin build from one mapping and cannot
  drift.

  One list item per node, nested two spaces per depth:

    - **6** (Choose 1) Do ONE of the following:
      - **6.beef-cattle** Option A—Beef Cattle. Do ALL of the following:

  - The label is node.path, not node.marker: a marker ("a.") only reads
    in the context of its parent's bubble; a path ("6.a",
    "6.beef-cattle") stands alone, and keeps a named option's name.
  - node.title, when set and not a prefix of the text, follows the label
    in italics.
  - node.pill renders as req-pill.html's wording in parentheses.
  - node.text goes through text/markdown-text.md; continuation lines
    indent to the item's content column.
  - node.list renders as a nested list, node.resources as a nested
    "Resources:" item with links.
  - variant, ring, transition_num, text_transition_key, content_name and
    guide_href are display-only and ignored. The heading promotion
    policy (text/heading-for.html) does not apply: text renders once,
    in full.

  Params (dict):
    nodes     - slice of node dicts (required)
    footnotes - optional, same shape as req-footnotes.html's
                ([{marker, text, text_format}]). Renders "[^marker]: text"
                definitions after the list, so the "[^N]" refs that
                text/markdown-text.md writes for <sup> links resolve.
                A multi-line definition indents its continuation lines
                four spaces.

  Returns: a Markdown string with no HTML tags. Call it from a
  plain-text output format (markdown, llms-full); an HTML template
  would escape it.
*/}}
{{ $lines := slice }}
{{ range .nodes }}
  {{ $textFormat := .text_format | default "markdown" }}
  {{ $text := partial "text/markdown-text.md" (dict "text" .text "text_format" $textFormat) }}

  {{ $head := printf "- **%s**" .path }}
  {{ with .title }}
    {{ if not (hasPrefix (lower $text) (lower .)) }}
      {{ $head = printf "%s *%s*" $head . }}
    {{ end }}
  {{ end }}

  {{ with .pill }}
    {{ if eq .type "select" }}
      {{ $head = printf "%s (Choose %d)" $head (int (.count | default 1)) }}
    {{ else if eq .type "all" }}
      {{ $head = printf "%s (Do all)" $head }}
    {{ end }}
  {{ end }}

  {{ $textLines := split $text "\n" }}
  {{ with index $textLines 0 }}{{ $head = printf "%s %s" $head . }}{{ end }}
  {{ $lines = $lines | append $head }}

  {{ range after 1 $textLines }}
    {{ $lines = $lines | append (cond (eq . "") "" (printf "  %s" .)) }}
  {{ end }}

  {{ with .list }}
    {{ $bullet := cond (eq .type "ol") "1." "-" }}
    {{ range .items }}
      {{ $lines = $lines | append (printf "  %s %s" $bullet .) }}
    {{ end }}
  {{ end }}

  {{ with .resources }}
    {{ $links := slice }}
    {{ range . }}{{ $links = $links | append (printf "[%s](%s)" .title .url) }}{{ end }}
    {{ $lines = $lines | append (printf "  - Resources: %s" (delimit $links ", ")) }}
  {{ end }}

  {{ with .children }}
    {{ $child := partial "text/requirements.md" (dict "nodes" .) }}
    {{ range split $child "\n" }}
      {{ $lines = $lines | append (cond (eq . "") "" (printf "  %s" .)) }}
    {{ end }}
  {{ end }}
{{ end }}

{{ with .footnotes }}
  {{ $lines = $lines | append "" }}
  {{ range . }}
    {{ $note := partial "text/markdown-text.md" (dict "text" .text "text_format" .text_format) }}
    {{ $noteLines := split $note "\n" }}
    {{ $lines = $lines | append (printf "[^%s]: %s" .marker (index $noteLines 0)) }}
    {{ range after 1 $noteLines }}
      {{ $lines = $lines | append (cond (eq . "") "" (printf "    %s" .)) }}
    {{ end }}
  {{ end }}
{{ end }}

{{ return (delimit $lines "\n") }}

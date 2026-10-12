{{- /* drg/blockquote.md

  Builds a Markdown blockquote for the .md variants of the DRG callout
  and requirement shortcodes (uni-theme#39): an optional bold label on
  the first line, then the body, every line prefixed with "> ".

  Params (dict):
    label - bold lead text, e.g. "Tip" or "6a." ("" for none)
    body  - Markdown body (may be multi-line)
    inline - bool; true puts the body on the label's line (requirements),
             false puts it on the lines below (callouts)

  Returns: the blockquote string, or "" when label and body are empty.
*/ -}}
{{- $label := .label | default "" -}}
{{- $body := strings.TrimSpace (.body | default "") -}}
{{- $lines := slice -}}
{{- $bodyLines := cond (eq $body "") slice (split $body "\n") -}}
{{- if .inline -}}
  {{- $first := "" -}}
  {{- with $label }}{{ $first = printf "**%s**" . }}{{ end -}}
  {{- if $bodyLines -}}
    {{- $first = strings.TrimSpace (printf "%s %s" $first (index $bodyLines 0)) -}}
    {{- $bodyLines = after 1 $bodyLines -}}
  {{- end -}}
  {{- with $first }}{{ $lines = $lines | append . }}{{ end -}}
{{- else -}}
  {{- with $label -}}
    {{- $lines = $lines | append (printf "**%s**" .) -}}
    {{- if $bodyLines }}{{ $lines = $lines | append "" }}{{ end -}}
  {{- end -}}
{{- end -}}
{{- $lines = $lines | append $bodyLines -}}
{{- $out := slice -}}
{{- range $lines -}}
  {{- $out = $out | append (cond (eq . "") ">" (printf "> %s" .)) -}}
{{- end -}}
{{- return (delimit $out "\n") -}}

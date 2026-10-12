{{- /* merit-badges/badge-facts.md

  The badge facts as a Markdown list, for the plain-text outputs (the
  badge landing and requirements .md twins, llms-full.txt). Call it only
  from a plain-text output format; an HTML template escapes it.

  Params (dict):
  json  - the badge's data/merit-badges/<slug>.json
  badge - the badge section Page
  page  - the page being rendered; the links leave it out

  Returns: a Markdown string with no HTML tags.
*/ -}}
{{- $json := .json -}}
{{- $badge := .badge -}}
{{- $lines := slice -}}
{{- if $json.discontinued -}}
  {{- $when := "" -}}
  {{- with $json.discontinued_date }}{{ $when = printf " effective %s" ((time .).Format "January 2, 2006") }}{{ end -}}
  {{- $lines = $lines | append (printf "- **Discontinued**%s. Scouts who began working on this badge before the discontinuation date have until December 31, 2026 to complete it." $when) -}}
{{- end -}}
{{- $eagle := cond $json.eagle_required "Yes" "No" -}}
{{- with $json.eagle_group }}{{ $eagle = printf "Yes, as one choice in the %s group" . }}{{ end -}}
{{- $lines = $lines | append (printf "- Eagle-required: %s" $eagle) -}}
{{- with $json.category }}{{ $lines = $lines | append (printf "- Category: %s" .) }}{{ end -}}
{{- with $json.url }}{{ $lines = $lines | append (printf "- Official requirements: %s" .) }}{{ end -}}
{{- with $json.pamphlet_url }}{{ $lines = $lines | append (printf "- Pamphlet: %s" .) }}{{ end -}}
{{- with $json.last_updated }}{{ $lines = $lines | append (printf "- Last synced from scouting.org: %s" .) }}{{ end -}}
{{- $links := slice (dict "label" "Overview" "page" $badge) (dict "label" "Requirements" "page" ($badge.GetPage "requirements")) (dict "label" "Digital Resource Guide" "page" ($badge.GetPage "guide")) -}}
{{- range $links -}}
  {{- if and .page (ne .page $.page) }}{{ $lines = $lines | append (printf "- %s: %s" .label (partial "llms/page-url.md" .page)) }}{{ end -}}
{{- end -}}
{{- return (delimit $lines "\n") -}}

{{- /* Markdown variant (uni-theme#39): bold title (and subtitle), then
  the items as a task list ("- " list items become "- [ ] "). */ -}}
{{- $head := printf "**%s**" (.Get "title") -}}
{{- with .Get "subtitle" }}{{ $head = printf "%s — %s" $head . }}{{ end -}}
{{ $head }}

{{ replaceRE `(?m)^(\s*)[-*] (?:\[[ xX]\] )?` "$1- [ ] " (strings.TrimSpace .Inner) }}
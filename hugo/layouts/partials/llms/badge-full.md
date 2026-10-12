{{- /* llms/badge-full.md: one badge's section of llms-full.txt
  (mbu#331). Params: badge (from llms/badges.html), page (the home Page).
  Returns: Markdown, no HTML. */ -}}
{{- $p := .badge.page -}}
{{- $json := .badge.json -}}
{{- $out := printf "## %s\n\n%s\n\n%s" .badge.name (partial "merit-badges/badge-facts.md" (dict "json" $json "badge" $p "page" .page)) (partial "text/requirements.md" (dict "nodes" (partial "merit-badges/requirement-nodes.html" (dict "json" $json "guide" ($p.GetPage "guide"))))) -}}
{{- return $out -}}

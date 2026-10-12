{{- /* Markdown variant (uni-theme#39): the image with its absolute URL
  (ImageKit at the largest served width, or the local resource before
  upload) and the caption in italics. */ -}}
{{- $img := partial "drg/image-resolve.html" . -}}
{{- $url := "" -}}
{{- if $img.local -}}
  {{- $url = $img.local.Permalink -}}
{{- else -}}
  {{- $url = partial "imagekit/url.html" (dict "path" $img.path "tr" (printf "w-%d" $img.max_width) "v" $img.v) -}}
{{- end -}}
![{{ $img.alt }}]({{ $url }})
{{- with $img.caption }}

*{{ . }}*
{{- end -}}
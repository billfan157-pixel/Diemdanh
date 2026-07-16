$bytes = [System.IO.File]::ReadAllBytes('src/core/utils.js')
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$idx = $text.IndexOf('GL.escapeHtml')
$snippet = $text.Substring($idx, 300)
Write-Host $snippet
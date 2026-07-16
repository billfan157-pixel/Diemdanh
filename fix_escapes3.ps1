$bytes = [System.IO.File]::ReadAllBytes('src/core/utils.js')
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
# Fix escapeHtml function - replace literal HTML entities with proper JS string literals
$text = $text -replace '&', '&'
$text = $text -replace '<', '<'
$text = $text -replace '>', '>'
$text = $text -replace '"', '"'
$text = $text -replace ''', '''
$text = $text -replace '&', '&'
$text = $text -replace '<', '<'
$text = $text -replace '>', '>'
$text = $text -replace '"', '"'
$text = $text -replace "'", '''
[System.IO.File]::WriteAllText('src/core/utils.js', $text, [System.Text.Encoding]::UTF8)
Write-Host "Fixed"
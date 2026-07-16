$content = Get-Content "src/core/utils.js" -Raw
$content = $content -replace '&', '&'
$content = $content -replace '<', '<'
$content = $content -replace '>', '>'
$content = $content -replace '"', '"'
$content = $content -replace ''', '''
Set-Content "src/core/utils.js" $content
$files = @(
    "c:\AvanceOS\EXPORT\avanceos\frontend\src\lib\osDocumentPdf.ts",
    "c:\AvanceOS\EXPORT\avanceos\frontend\src\lib\receiptPdf.ts",
    "c:\AvanceOS\EXPORT\avanceos\frontend\src\lib\techHubPdf.ts",
    "c:\AvanceOS\EXPORT\avanceos\frontend\src\schemas\contabilidade.schema.ts"
)

foreach ($f in $files) {
    $text = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
    $bytes = [System.Text.Encoding]::GetEncoding(1252).GetBytes($text)
    $fixedText = [System.Text.Encoding]::UTF8.GetString($bytes)
    [System.IO.File]::WriteAllText($f, $fixedText, [System.Text.Encoding]::UTF8)
}
Write-Host "Encoding fixed!"

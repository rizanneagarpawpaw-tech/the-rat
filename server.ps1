<#
.SYNOPSIS
    Portfolio server - serves the site, the database file and the admin API.
.DESCRIPTION
    Zero-dependency HTTP server for Windows PowerShell 5.1+.
    No admin rights and no installation required.

    Routes:
        GET    /            -> index.html (the portfolio)
        GET    /admin.html  -> the admin panel
        GET    /api/data    -> current contents of db.json  (the database)
        GET    /api/seed    -> pristine db.seed.json
        POST   /api/data    -> save a new database  (requires x-admin-key header)
        POST   /api/reset   -> restore db.json from db.seed.json (requires key)
        OPTIONS/*           -> CORS preflight
        anything else       -> static file from this folder
.PARAMETER Port
    TCP port to listen on. Default 4173.
.PARAMETER AdminKey
    Password the admin panel must send when saving.
    Default: portfolio-admin  (override with the ADMIN_KEY env variable)
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\server.ps1
    # then open http://localhost:4173  and  http://localhost:4173/admin.html
#>
param(
    [int]$Port = 4173,
    [string]$HostName = '127.0.0.1',
    [string]$AdminKey = $(if ($env:ADMIN_KEY) { $env:ADMIN_KEY } else { 'portfolio-admin' })
)

$ErrorActionPreference = 'Stop'

$Root     = $PSScriptRoot
$DbFile   = Join-Path $Root 'db.json'
$SeedFile = Join-Path $Root 'db.seed.json'

$UTF8   = New-Object System.Text.UTF8Encoding($false)   # no BOM
$ASCII  = [System.Text.Encoding]::ASCII

$Mime = @{
    '.html'       = 'text/html; charset=utf-8'
    '.css'        = 'text/css; charset=utf-8'
    '.js'         = 'application/javascript; charset=utf-8'
    '.json'       = 'application/json; charset=utf-8'
    '.svg'        = 'image/svg+xml'
    '.png'        = 'image/png'
    '.jpg'        = 'image/jpeg'
    '.jpeg'       = 'image/jpeg'
    '.gif'        = 'image/gif'
    '.webp'       = 'image/webp'
    '.ico'        = 'image/x-icon'
    '.woff'       = 'font/woff'
    '.woff2'      = 'font/woff2'
    '.txt'        = 'text/plain; charset=utf-8'
    '.webmanifest'= 'application/manifest+json'
    '.map'        = 'application/json; charset=utf-8'
}

# ---------------------------------------------------------------- helpers ---
function Send-Response {
    param($Stream, [int]$Status, [string]$Text, [string]$ContentType, [byte[]]$Body, [hashtable]$Extra)

    if ($null -eq $Body) { $Body = [byte[]]@() }
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.Append("HTTP/1.1 $Status $Text`r`n")
    [void]$sb.Append("Content-Type: $ContentType`r`n")
    [void]$sb.Append("Content-Length: $($Body.Length)`r`n")
    [void]$sb.Append("Connection: close`r`n")
    [void]$sb.Append("Cache-Control: no-store`r`n")
    [void]$sb.Append("X-Content-Type-Options: nosniff`r`n")
    [void]$sb.Append("Referrer-Policy: strict-origin-when-cross-origin`r`n")
    [void]$sb.Append("Access-Control-Allow-Origin: *`r`n")
    if ($Extra) {
        foreach ($k in $Extra.Keys) { [void]$sb.Append("${k}: $($Extra[$k])`r`n") }
    }
    [void]$sb.Append("`r`n")

    $head = $UTF8.GetBytes($sb.ToString())
    $Stream.Write($head, 0, $head.Length)
    # a response to HEAD must carry headers only - never a body,
    # otherwise browsers drop the connection (ERR_EMPTY_RESPONSE)
    if ($script:RequestMethod -ne 'HEAD' -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

function Send-Json {
    param($Stream, [int]$Status, $Object)
    Send-Response $Stream $Status $(switch ($Status) { 200 { 'OK' } 400 { 'Bad Request' } 401 { 'Unauthorized' } 404 { 'Not Found' } 413 { 'Payload Too Large' } 500 { 'Internal Server Error' } default { 'OK' } }) `
        'application/json; charset=utf-8' $UTF8.GetBytes(($Object | ConvertTo-Json -Compress -Depth 6))
}

function Send-File {
    param($Stream, [string]$FullPath, [string]$RelPath)
    if (-not (Test-Path -LiteralPath $FullPath -PathType Leaf)) {
        Send-Response $Stream 404 'Not Found' 'text/plain; charset=utf-8' $UTF8.GetBytes("404 - $RelPath not found")
        return
    }
    $ext  = [System.IO.Path]::GetExtension($FullPath).ToLower()
    $type = if ($Mime.ContainsKey($ext)) { $Mime[$ext] } else { 'application/octet-stream' }
    Send-Response $Stream 200 'OK' $type ([System.IO.File]::ReadAllBytes($FullPath))
}

function Log-Line {
    param([string]$Status, [string]$Message, [string]$Color = 'DarkGray')
    Write-Host ('  {0}  {1}  {2}' -f (Get-Date -Format 'HH:mm:ss'), $Status.PadRight(4), $Message) -ForegroundColor $Color
}

# ------------------------------------------------------------- connection ---
function Invoke-Request {
    param($Client)

    $Client.ReceiveTimeout = 5000
    $Stream = $Client.GetStream()
    $buffer = New-Object byte[] 8192
    $memory = New-Object System.IO.MemoryStream
    $headerText = ''

    # read until end of headers
    while ($true) {
        $n = $Stream.Read($buffer, 0, $buffer.Length)
        if ($n -le 0) { return }
        $memory.Write($buffer, 0, $n)
        $headerText = $ASCII.GetString($memory.ToArray())
        $cut = $headerText.IndexOf("`r`n`r`n")
        if ($cut -ge 0) { break }
        if ($memory.Length -gt 65536) { return }
    }

    $lines  = [regex]::Split($headerText.Substring(0, $cut), "`r`n")
    $parts  = $lines[0] -split ' '
    if ($parts.Count -lt 2) { return }
    $Method   = $parts[0].ToUpper()
    $RawPath  = $parts[1]
    $script:RequestMethod = $Method

    $headers = @{}
    if ($lines.Count -gt 1) {
        foreach ($line in $lines[1..($lines.Count - 1)]) {
            $p = $line.IndexOf(':')
            if ($p -gt 0) { $headers[$line.Substring(0, $p).Trim().ToLower()] = $line.Substring($p + 1).Trim() }
        }
    }

    # read body if announced
    $Body = $null
    if ($headers.ContainsKey('content-length')) {
        $len = [Math]::Min([int]$headers['content-length'], 10MB)
        $bodyBuf = New-Object byte[] $len
        $got = 0
        $all = $memory.ToArray()
        $extraLen = $all.Length - ($cut + 4)
        if ($extraLen -gt 0) {
            $take = [Math]::Min($extraLen, $len)
            [Array]::Copy($all, $cut + 4, $bodyBuf, 0, $take)
            $got = $take
        }
        while ($got -lt $len) {
            $r = $Stream.Read($bodyBuf, $got, $len - $got)
            if ($r -le 0) { break }
            $got += $r
        }
        $Body = $bodyBuf
    }

    $CORS = @{
        'Access-Control-Allow-Methods' = 'GET, POST, OPTIONS'
        'Access-Control-Allow-Headers' = 'Content-Type, x-admin-key'
        'Access-Control-Max-Age'       = '86400'
    }

    if ($Method -eq 'OPTIONS') {
        Send-Response $Stream 204 'No Content' 'text/plain' $null $CORS
        Log-Line '204' "$Method $RawPath (preflight)"
        return
    }

    $Path = [System.Uri]::UnescapeDataString(($RawPath -split '\?')[0])

    # ------------------------------------------------------------- API ------
    if ($Path.StartsWith('/api/')) {

        switch ("$Method $Path") {

            'GET /api/data' {
                if (-not (Test-Path -LiteralPath $DbFile)) { Copy-Item -LiteralPath $SeedFile -Destination $DbFile }
                Send-File $Stream $DbFile $Path
                Log-Line '200' "$Method $Path" 'Green'
                return
            }

            'GET /api/seed' {
                Send-File $Stream $SeedFile $Path
                Log-Line '200' "$Method $Path" 'Green'
                return
            }

            'POST /api/data' {
                $key = ''
                if ($headers.ContainsKey('x-admin-key')) { $key = $headers['x-admin-key'] }
                if ($key -ne $AdminKey) {
                    Send-Json $Stream 401 @{ ok = $false; error = 'Wrong admin key.' }
                    Log-Line '401' "$Method $Path (bad key)" 'Red'
                    return
                }
                try {
                    $text = $UTF8.GetString($Body)
                    $null = $text | ConvertFrom-Json          # validation only
                    $tmp  = "$DbFile.tmp"
                    [System.IO.File]::WriteAllText($tmp, $text, $UTF8)
                    Move-Item -LiteralPath $tmp -Destination $DbFile -Force
                    $stamp = (Get-Date).ToString('o')
                    Send-Json $Stream 200 @{ ok = $true; savedAt = $stamp }
                    Log-Line '200' "$Method $Path (database saved)" 'Green'
                } catch {
                    Send-Json $Stream 400 @{ ok = $false; error = "Invalid JSON: $($_.Exception.Message)" }
                    Log-Line '400' "$Method $Path (invalid JSON)" 'Red'
                }
                return
            }

            'POST /api/reset' {
                $key = ''
                if ($headers.ContainsKey('x-admin-key')) { $key = $headers['x-admin-key'] }
                if ($key -ne $AdminKey) {
                    Send-Json $Stream 401 @{ ok = $false; error = 'Wrong admin key.' }
                    Log-Line '401' "$Method $Path (bad key)" 'Red'
                    return
                }
                Copy-Item -LiteralPath $SeedFile -Destination $DbFile -Force
                Send-Json $Stream 200 @{ ok = $true; message = 'Database restored from db.seed.json' }
                Log-Line '200' "$Method $Path (database reset)" 'Yellow'
                return
            }

            default {
                Send-Json $Stream 404 @{ ok = $false; error = "No such endpoint: $Method $Path" }
                Log-Line '404' "$Method $Path" 'DarkYellow'
                return
            }
        }
    }

    # --------------------------------------------------------- static files --
    $rel = $Path.TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    if ($rel.EndsWith('/')) { $rel += 'index.html' }

    $rootFull = [System.IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
    $full     = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))

    if (-not $full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Response $Stream 403 'Forbidden' 'text/plain; charset=utf-8' $UTF8.GetBytes('403 - outside of the site root')
        Log-Line '403' "$Method $Path (traversal blocked)" 'Red'
        return
    }
    if (Test-Path -LiteralPath $full -PathType Container) { $full = Join-Path $full 'index.html' }

    Send-File $Stream $full $Path
    Log-Line '200' "$Method $Path" 'Green'
}

# ------------------------------------------------------------------ start ---
if (-not (Test-Path -LiteralPath $DbFile)) {
    if (Test-Path -LiteralPath $SeedFile) {
        Copy-Item -LiteralPath $SeedFile -Destination $DbFile
        Write-Host '  db.json was missing - created from db.seed.json' -ForegroundColor Yellow
    }
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Parse($HostName), $Port)
try {
    $listener.Start()
} catch {
    Write-Host "`n  Port $Port is already in use. Try: .\server.ps1 -Port 8080`n" -ForegroundColor Red
    exit 1
}

$nl = [Environment]::NewLine
Write-Host ''
Write-Host '  +---------------------------------------------------+' -ForegroundColor Magenta
Write-Host '  |        A R I A   V A L E   -   P O R T F O L I O |' -ForegroundColor Magenta
Write-Host '  +---------------------------------------------------+' -ForegroundColor Magenta
Write-Host ''
Write-Host "  Portfolio   http://$HostName`:$Port/"          -ForegroundColor Cyan
Write-Host "  Admin panel http://$HostName`:$Port/admin.html" -ForegroundColor Cyan
Write-Host "  Database    $DbFile"                           -ForegroundColor DarkGray
Write-Host "  Admin key   $AdminKey"                         -ForegroundColor DarkGray
Write-Host ''
Write-Host '  Press Ctrl+C to stop.' -ForegroundColor DarkGray
Write-Host ''

while ($true) {
    $client = $listener.AcceptTcpClient()
    try { Invoke-Request $client } catch {
        Log-Line 'ERR' $_.Exception.Message 'Red'
    } finally { $client.Close() }
}

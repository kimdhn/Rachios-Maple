$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

function Refresh-UvPath {
    $paths = @(
        "$env:USERPROFILE\.local\bin",
        "$env:USERPROFILE\.cargo\bin"
    )

    foreach ($path in $paths) {
        if ((Test-Path $path) -and (($env:Path -split ";") -notcontains $path)) {
            $env:Path = "$path;$env:Path"
        }
    }
}

Refresh-UvPath

function Get-EnvValue {
    param([string]$Key)

    if (-not (Test-Path ".env")) {
        return ""
    }

    $line = Get-Content ".env" -Encoding UTF8 | Where-Object { $_ -like "$Key=*" } | Select-Object -Last 1
    if (-not $line) {
        return ""
    }

    return $line.Substring($Key.Length + 1)
}

function Set-EnvValue {
    param(
        [string]$Key,
        [string]$Value
    )

    $prefix = "$Key="
    $lines = @()
    if (Test-Path ".env") {
        $lines = @(Get-Content ".env" -Encoding UTF8)
    }

    $updated = $false
    $nextLines = foreach ($line in $lines) {
        if ($line.StartsWith($prefix)) {
            "$prefix$Value"
            $updated = $true
        } else {
            $line
        }
    }

    if (-not $updated) {
        $nextLines += "$prefix$Value"
    }

    Set-Content -Path ".env" -Value $nextLines -Encoding UTF8
}

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "uv was not found. Installing uv..."
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    Refresh-UvPath
}

if (-not (Test-Path ".env")) {
    Write-Host ".env was not found. Copying .env.example to .env..."
    Copy-Item ".env.example" ".env"
}

if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

$apiKey = Get-EnvValue "NEXON_OPEN_API_KEY"
if ([string]::IsNullOrWhiteSpace($apiKey) -or $apiKey -eq "YOUR_NEXON_OPEN_API_KEY") {
    Write-Host ""
    Write-Host "NEXON_OPEN_API_KEY is empty."
    $apiKey = Read-Host "Enter your Nexon Open API key"
    Write-Host ""

    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        Write-Host "API key was not entered. Aborting."
        exit 1
    }

    Set-EnvValue "NEXON_OPEN_API_KEY" $apiKey
    Write-Host "Saved API key to .env."
}

$adminPassword = Get-EnvValue "DB_ADMIN_PASSWORD"
if ([string]::IsNullOrWhiteSpace($adminPassword) -or $adminPassword -eq "YOUR_DB_ADMIN_PASSWORD") {
    Write-Host ""
    Write-Host "DB_ADMIN_PASSWORD is empty."
    $adminPassword = Read-Host "Enter the admin password for DB cleanup buttons"
    Write-Host ""

    if ([string]::IsNullOrWhiteSpace($adminPassword)) {
        Write-Host "Admin password was not entered. Aborting."
        exit 1
    }

    Set-EnvValue "DB_ADMIN_PASSWORD" $adminPassword
    Write-Host "Saved admin password to .env."
}

$appHost = Get-EnvValue "APP_HOST"
$appPort = Get-EnvValue "APP_PORT"
if ([string]::IsNullOrWhiteSpace($appHost)) {
    $appHost = "127.0.0.1"
}
if ([string]::IsNullOrWhiteSpace($appPort)) {
    $appPort = "1939"
}
Write-Host "Starting server: http://${appHost}:${appPort}"
if ($appHost -eq "0.0.0.0" -or $appHost -eq "::") {
    Write-Host "Local access: http://127.0.0.1:${appPort}"
}
Write-Host "DB change log: $(Join-Path $ProjectRoot 'logs\db_changes.log')"
uv run python app.py

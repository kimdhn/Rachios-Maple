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

    $line = Get-Content ".env" | Where-Object { $_ -like "$Key=*" } | Select-Object -Last 1
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
        $lines = @(Get-Content ".env")
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

    Set-Content -Path ".env" -Value $nextLines
}

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "uv가 없습니다. uv를 설치합니다..."
    powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    Refresh-UvPath
}

if (-not (Test-Path ".env")) {
    Write-Host ".env가 없어 .env.example을 복사합니다."
    Copy-Item ".env.example" ".env"
}

$apiKey = Get-EnvValue "NEXON_OPEN_API_KEY"
if ([string]::IsNullOrWhiteSpace($apiKey) -or $apiKey -eq "여기에_내_API_키") {
    Write-Host ""
    Write-Host "NEXON_OPEN_API_KEY가 비어 있습니다."
    $apiKey = Read-Host "넥슨 Open API 키를 입력하세요"
    Write-Host ""

    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        Write-Host "API 키가 입력되지 않아 서버 실행을 중단합니다."
        exit 1
    }

    Set-EnvValue "NEXON_OPEN_API_KEY" $apiKey
    Write-Host ".env에 API 키를 저장했습니다."
}

$adminPassword = Get-EnvValue "DB_ADMIN_PASSWORD"
if ([string]::IsNullOrWhiteSpace($adminPassword) -or $adminPassword -eq "여기에_관리_비밀번호") {
    Write-Host ""
    Write-Host "DB_ADMIN_PASSWORD가 비어 있습니다."
    $adminPassword = Read-Host "DB 정리 버튼에 사용할 관리 비밀번호를 입력하세요"
    Write-Host ""

    if ([string]::IsNullOrWhiteSpace($adminPassword)) {
        Write-Host "관리 비밀번호가 입력되지 않아 서버 실행을 중단합니다."
        exit 1
    }

    Set-EnvValue "DB_ADMIN_PASSWORD" $adminPassword
    Write-Host ".env에 관리 비밀번호를 저장했습니다."
}

$appHost = Get-EnvValue "APP_HOST"
$appPort = Get-EnvValue "APP_PORT"
if ([string]::IsNullOrWhiteSpace($appHost)) {
    $appHost = "127.0.0.1"
}
if ([string]::IsNullOrWhiteSpace($appPort)) {
    $appPort = "1939"
}
$displayHost = $appHost
if ($displayHost -eq "0.0.0.0" -or $displayHost -eq "::") {
    $displayHost = "127.0.0.1"
}

Write-Host "서버를 실행합니다: http://${displayHost}:${appPort}"
uv run python app.py

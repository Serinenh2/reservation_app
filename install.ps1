<#
  Installation de l'application Reservations sur l'ordinateur de la salle.

  Lancez install.bat (double-clic). Ce script :
    1. installe WSL 2 et Docker Desktop s'ils manquent (droits administrateur) ;
    2. copie l'application dans le dossier d'installation (C:\reservations-app) ;
    3. cree le fichier .env (cle secrete aleatoire, compte administrateur) ;
    4. ouvre l'acces aux autres ordinateurs du reseau si vous le demandez ;
    5. construit et demarre l'application, puis cree les raccourcis du bureau.

  Il peut etre relance sans risque : mise a jour de l'application, les donnees
  et le fichier .env existants sont conserves.

  Options (facultatives, pour une installation sans questions) :
    -InstallDir C:\autre\dossier   -AdminUser admin   -AdminPassword "..."
    -LanAccess Oui|Non   -NoShortcuts   -NoBrowser
#>
[CmdletBinding()]
param(
    [string]$InstallDir = 'C:\reservations-app',
    [string]$AdminUser,
    [string]$AdminPassword,
    [ValidateSet('', 'Oui', 'Non')][string]$LanAccess = '',
    [switch]$NoShortcuts,
    [switch]$NoBrowser,
    [switch]$PauseAtEnd   # set when the script relaunches itself as administrator (new window)
)

$ErrorActionPreference = 'Stop'
$Source = $PSScriptRoot
$DockerExe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
$DockerBin = Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin'
$Port = 3000

# --- Small helpers -----------------------------------------------------------
function Step($text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "    $text" -ForegroundColor Green }
function Info($text) { Write-Host "    $text" }
function Finish($code) {
    if ($PauseAtEnd) { Read-Host 'Appuyez sur Entree pour fermer' | Out-Null }
    exit $code
}
function Fail($text) {
    Write-Host ''
    Write-Host "ERREUR : $text" -ForegroundColor Red
    Finish 1
}
function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
# Relaunch this script as administrator with the same options, then stop this copy.
function Restart-AsAdmin($reason) {
    if (Test-Admin) { return }
    Info "$reason : droits administrateur necessaires, Windows va demander l'autorisation."
    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-InstallDir', "`"$InstallDir`"")
    if ($AdminUser) { $argList += @('-AdminUser', "`"$AdminUser`"") }
    if ($AdminPassword) { $argList += @('-AdminPassword', "`"$AdminPassword`"") }
    if ($LanAccess) { $argList += @('-LanAccess', $LanAccess) }
    if ($NoShortcuts) { $argList += '-NoShortcuts' }
    if ($NoBrowser) { $argList += '-NoBrowser' }
    $argList += '-PauseAtEnd'
    Start-Process powershell.exe -Verb RunAs -ArgumentList $argList -Wait
    exit 0
}
function Test-Docker { & docker info *> $null; return ($LASTEXITCODE -eq 0) }
function Ask-YesNo($question, $default) {
    $hint = if ($default) { '[O/n]' } else { '[o/N]' }
    $answer = Read-Host "    $question $hint"
    if ([string]::IsNullOrWhiteSpace($answer)) { return $default }
    return $answer.Trim().ToLower().StartsWith('o') -or $answer.Trim().ToLower().StartsWith('y')
}
function New-Secret($length) {
    $chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'.ToCharArray()
    $bytes = New-Object byte[] $length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}
# Values are written between single quotes: Docker reads them literally ($, # ...).
function EnvValue($value) { return "'" + $value + "'" }

Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '  Installation - Reservations' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan

if (-not (Test-Path (Join-Path $Source 'docker-compose.yml'))) {
    Fail "lancez install.bat depuis le dossier de l'application (docker-compose.yml introuvable)."
}

# --- 1. WSL 2 and Docker Desktop ---------------------------------------------
Step 'Verification de Docker Desktop'
$env:Path = "$DockerBin;$env:Path"
$needsReboot = $false

if (-not (Test-Path $DockerExe)) {
    Restart-AsAdmin 'Installation de Docker Desktop'

    Step 'Installation de WSL 2 (necessaire pour Docker)'
    & wsl.exe --status *> $null
    if ($LASTEXITCODE -ne 0) {
        & wsl.exe --install --no-distribution
        $needsReboot = $true
        Ok 'WSL 2 installe.'
    } else {
        Ok 'WSL 2 deja present.'
    }

    Step 'Telechargement et installation de Docker Desktop (internet necessaire, quelques minutes)'
    $installer = Join-Path $env:TEMP 'DockerDesktopInstaller.exe'
    try {
        Invoke-WebRequest -UseBasicParsing -Uri 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe' -OutFile $installer
    } catch {
        Fail "telechargement de Docker Desktop impossible. Verifiez la connexion internet. ($($_.Exception.Message))"
    }
    $p = Start-Process $installer -ArgumentList 'install', '--quiet', '--accept-license', '--backend=wsl-2' -Wait -PassThru
    if ($p.ExitCode -ne 0) { Fail "l'installation de Docker Desktop a echoue (code $($p.ExitCode))." }
    Remove-Item $installer -ErrorAction SilentlyContinue

    # The user must be in docker-users to use Docker without administrator rights.
    $me = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    & net.exe localgroup docker-users "$me" /add *> $null
    Ok 'Docker Desktop installe.'
    $needsReboot = $true
}

if ($needsReboot) {
    Write-Host ''
    Write-Host 'Redemarrez l''ordinateur, puis relancez install.bat pour terminer l''installation.' -ForegroundColor Yellow
    Finish 0
}
Ok 'Docker Desktop est installe.'

# Start with Windows (setting of Docker Desktop, both file names exist depending on the version).
foreach ($name in 'settings-store.json', 'settings.json') {
    $file = Join-Path $env:APPDATA "Docker\$name"
    if (Test-Path $file) {
        try {
            $json = Get-Content $file -Raw | ConvertFrom-Json
            if ($json.PSObject.Properties.Name -contains 'AutoStart') { $json.AutoStart = $true }
            else { $json | Add-Member -NotePropertyName AutoStart -NotePropertyValue $true }
            # Without BOM: Docker Desktop cannot read a settings file that starts with one.
            [IO.File]::WriteAllText($file, ($json | ConvertTo-Json -Depth 20), (New-Object Text.UTF8Encoding $false))
            Ok 'Docker Desktop demarrera avec Windows.'
        } catch { Info "Reglage du demarrage automatique ignore ($name)." }
        break
    }
}

if (-not (Test-Docker)) {
    Info 'Demarrage de Docker Desktop, patientez...'
    Start-Process $DockerExe
    $deadline = (Get-Date).AddMinutes(4)
    while (-not (Test-Docker)) {
        if ((Get-Date) -gt $deadline) {
            Fail 'Docker ne demarre pas. Ouvrez Docker Desktop, acceptez les conditions si elles s''affichent, puis relancez install.bat.'
        }
        Start-Sleep -Seconds 3
    }
}
Ok 'Docker fonctionne.'

# --- 2. Copy the application -------------------------------------------------
Step "Copie de l'application dans $InstallDir"
$sameFolder = (Resolve-Path $Source).Path.TrimEnd('\') -ieq [IO.Path]::GetFullPath($InstallDir).TrimEnd('\')
if ($sameFolder) {
    Ok "L'application est deja dans ce dossier."
} else {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    # Development files are not copied: libraries, local database, git, builds.
    & robocopy.exe $Source $InstallDir /E /NFL /NDL /NJH /NJS /NP `
        /XD node_modules .venv .git dist __pycache__ staticfiles (Join-Path $Source 'backend\data') (Join-Path $Source 'backups') `
        /XF .env *.pyc *.sqlite3 *.log | Out-Null
    if ($LASTEXITCODE -ge 8) { Fail "copie impossible vers $InstallDir (robocopy code $LASTEXITCODE)." }
    New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir 'backups') | Out-Null
    Ok 'Fichiers copies.'
}
Set-Location $InstallDir

# --- 3. .env file -------------------------------------------------------------
Step 'Configuration (.env)'
$envFile = Join-Path $InstallDir '.env'
if (Test-Path $envFile) {
    Ok 'Fichier .env existant conserve (mots de passe inchanges).'
} else {
    if (-not $AdminUser) {
        $AdminUser = Read-Host "    Nom d'utilisateur de l'administrateur [admin]"
        if ([string]::IsNullOrWhiteSpace($AdminUser)) { $AdminUser = 'admin' }
    }
    if ($AdminUser -notmatch '^[\w.@+-]+$') { Fail "nom d'utilisateur invalide (lettres, chiffres et . @ + - _ seulement)." }

    while (-not $AdminPassword) {
        $p1 = Read-Host '    Mot de passe de l''administrateur (8 caracteres minimum)' -AsSecureString
        $p2 = Read-Host '    Confirmez le mot de passe' -AsSecureString
        $t1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1))
        $t2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2))
        if ($t1 -ne $t2) { Write-Host '    Les deux mots de passe sont differents.' -ForegroundColor Yellow }
        elseif ($t1.Length -lt 8) { Write-Host '    Trop court : 8 caracteres minimum.' -ForegroundColor Yellow }
        elseif ($t1.Contains("'")) { Write-Host '    L''apostrophe ('') n''est pas acceptee dans le mot de passe.' -ForegroundColor Yellow }
        else { $AdminPassword = $t1 }
    }
    if ($AdminPassword.Length -lt 8 -or $AdminPassword.Contains("'")) { Fail 'mot de passe invalide (8 caracteres minimum, sans apostrophe).' }

    $lines = @(
        '# Cree par install.ps1. Gardez ce fichier prive : il contient les mots de passe.',
        "DJANGO_SECRET_KEY=$(EnvValue (New-Secret 64))",
        'DJANGO_DEBUG=0',
        'TZ=Africa/Algiers',
        '',
        '# Premier compte administrateur (cree au premier demarrage seulement).',
        "ADMIN_USERNAME=$(EnvValue $AdminUser)",
        "ADMIN_PASSWORD=$(EnvValue $AdminPassword)",
        'ADMIN_EMAIL=',
        '',
        '# Emails : affiches dans les journaux (fonctionne hors ligne).',
        'EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend',
        'EMAIL_HOST=',
        'EMAIL_PORT=587',
        'EMAIL_HOST_USER=',
        'EMAIL_HOST_PASSWORD=',
        'EMAIL_USE_TLS=1',
        'DEFAULT_FROM_EMAIL=reservations@localhost'
    )
    [IO.File]::WriteAllLines($envFile, $lines, (New-Object Text.UTF8Encoding $false))
    Ok "Fichier .env cree (administrateur : $AdminUser)."
}

# --- 4. Access from the other computers of the network (optional) ------------
Step 'Acces depuis les autres ordinateurs du reseau'
$envText = Get-Content $envFile -Raw
if ($envText -match '(?m)^DJANGO_ALLOWED_HOSTS=') {
    Ok 'Deja configure (voir DJANGO_ALLOWED_HOSTS dans .env).'
} else {
    $wantLan = if ($LanAccess) { $LanAccess -eq 'Oui' } else { Ask-YesNo 'Utiliser l''application aussi depuis d''autres ordinateurs ou telephones du reseau ?' $false }
    if ($wantLan) {
        # Administrator rights first (firewall): the relaunched copy redoes this step from the start.
        $LanAccess = 'Oui'
        Restart-AsAdmin 'Ouverture du pare-feu'
        $ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
            Select-Object -ExpandProperty IPAddress -Unique)
        $hosts = @('localhost', '127.0.0.1', 'backend', $env:COMPUTERNAME.ToLower()) + $ips
        $origins = @('localhost', '127.0.0.1', $env:COMPUTERNAME.ToLower()) + $ips | ForEach-Object { "http://${_}:$Port" }
        Add-Content -Path $envFile -Encoding UTF8 -Value @(
            '',
            '# Acces depuis le reseau local (ajoute par install.ps1).',
            "DJANGO_ALLOWED_HOSTS=$($hosts -join ',')",
            "DJANGO_CSRF_TRUSTED_ORIGINS=$($origins -join ',')"
        )
        if (-not (Get-NetFirewallRule -DisplayName 'Reservations (port 3000)' -ErrorAction SilentlyContinue)) {
            New-NetFirewallRule -DisplayName 'Reservations (port 3000)' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private, Domain | Out-Null
        }
        Ok 'Acces reseau autorise. Adresses a utiliser sur les autres appareils :'
        foreach ($ip in $ips) { Info "      http://${ip}:$Port" }
        Info "      http://$($env:COMPUTERNAME.ToLower()):$Port"
    } else {
        Ok 'Acces limite a cet ordinateur.'
    }
}

# --- 5. Build and start --------------------------------------------------------
Step "Construction et demarrage de l'application (la premiere fois : plusieurs minutes)"
& docker compose up -d --build --wait
if ($LASTEXITCODE -ne 0) {
    Fail "l'application n'a pas demarre. Details : docker compose logs backend (dans $InstallDir)."
}
Ok "Application demarree : http://localhost:$Port"

# --- 6. Desktop shortcuts --------------------------------------------------------
if (-not $NoShortcuts) {
    Step 'Raccourcis sur le bureau'
    $shell = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath('Desktop')
    $shortcuts = @(
        @{ Name = 'Reservations'; Target = (Get-ChildItem $InstallDir -Filter 'Ouvrir*.bat' | Select-Object -First 1).FullName },
        @{ Name = 'Sauvegarde Reservations'; Target = (Join-Path $InstallDir 'Sauvegarde.bat') }
    )
    foreach ($s in $shortcuts) {
        if (-not $s.Target -or -not (Test-Path $s.Target)) { continue }
        $link = $shell.CreateShortcut((Join-Path $desktop "$($s.Name).lnk"))
        $link.TargetPath = $s.Target
        $link.WorkingDirectory = $InstallDir
        $link.Save()
        Ok "Raccourci cree : $($s.Name)"
    }
}

Write-Host ''
Write-Host '==============================================' -ForegroundColor Green
Write-Host '  Installation terminee.' -ForegroundColor Green
Write-Host "  Adresse : http://localhost:$Port" -ForegroundColor Green
Write-Host '  Sauvegarde : raccourci "Sauvegarde Reservations"' -ForegroundColor Green
Write-Host '==============================================' -ForegroundColor Green
if (-not $NoBrowser) { Start-Process "http://localhost:$Port" }
Finish 0

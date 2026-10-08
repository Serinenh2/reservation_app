<#
  Installation de l'application Reservations sur l'ordinateur de la salle.

  Lancez install.bat (double-clic) : il demande les droits administrateur
  puis execute ce script dans la meme fenetre.

  Etapes :
    0. verifications (Windows, virtualisation, memoire, disque, port 3000) ;
    1. installe WSL 2 et Docker Desktop s'ils manquent ;
    2. copie l'application dans C:\reservations-app ;
    3. cree le fichier .env (cle secrete aleatoire, compte administrateur) ;
    4. ouvre l'acces aux autres ordinateurs du reseau si vous le demandez ;
    5. construit et demarre l'application, verifie qu'elle repond ;
    6. cree les raccourcis du bureau.

  Relancer install.bat est sans risque (mise a jour) : les donnees et le
  fichier .env existants sont conserves.

  Tout est enregistre dans install-log.txt (a cote de install.bat).

  Fonctionne avec Windows PowerShell 5.1 (inclus dans Windows) et PowerShell 7.

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
# Windows PowerShell 5.1: the progress bar makes downloads 10-50x slower, and
# old defaults refuse modern HTTPS (TLS 1.2 is required by docker.com).
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch { }

$Source = $PSScriptRoot
$DockerExe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
$DockerBin = Join-Path $env:ProgramFiles 'Docker\Docker\resources\bin'
$Port = 3000
$LogFile = Join-Path $Source 'install-log.txt'

# --- Small helpers -------------------------------------------------------------
function Step($text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "    $text" -ForegroundColor Green }
function Info($text) { Write-Host "    $text" }
function Warn($text) { Write-Host "    ATTENTION : $text" -ForegroundColor Yellow }
function Finish($code) {
    try { Stop-Transcript | Out-Null } catch { }
    if ($PauseAtEnd) { Read-Host 'Appuyez sur Entree pour fermer' | Out-Null }
    exit $code
}
function Fail($text) {
    Write-Host ''
    Write-Host "ERREUR : $text" -ForegroundColor Red
    Write-Host "Le detail de l'installation est dans : $LogFile" -ForegroundColor Red
    Finish 1
}
function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}
# Only used when install.ps1 is started by hand without administrator rights
# (install.bat already asks for them): relaunch with the same options.
function Restart-AsAdmin($reason) {
    if (Test-Admin) { return }
    Info "$reason : droits administrateur necessaires, Windows va demander l'autorisation."
    $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-InstallDir', "`"$InstallDir`"", '-PauseAtEnd')
    if ($AdminUser) { $argList += @('-AdminUser', "`"$AdminUser`"") }
    if ($AdminPassword) { $argList += @('-AdminPassword', "`"$AdminPassword`"") }
    if ($LanAccess) { $argList += @('-LanAccess', $LanAccess) }
    if ($NoShortcuts) { $argList += '-NoShortcuts' }
    if ($NoBrowser) { $argList += '-NoBrowser' }
    try {
        Start-Process powershell.exe -Verb RunAs -ArgumentList $argList -Wait
    } catch {
        Fail 'autorisation administrateur refusee. Relancez install.bat et cliquez sur "Oui".'
    }
    Finish 0
}
# External programs. In Windows PowerShell 5.1 with ErrorActionPreference=Stop, a
# program that writes to stderr (docker, wsl...) would stop the whole script:
# these two helpers run it with 'Continue' and return its exit code.
function Invoke-Quiet([string]$exe, [string[]]$arguments) {
    $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    try { & $exe @arguments *> $null } finally { $ErrorActionPreference = $old }
    return $LASTEXITCODE
}
# Same, but shows (and logs) what the program prints.
function Invoke-Shown([string]$exe, [string[]]$arguments) {
    $old = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    try { & $exe @arguments 2>&1 | ForEach-Object { Write-Host "    $_" } } finally { $ErrorActionPreference = $old }
    return $LASTEXITCODE
}
function Test-Docker { return ((Invoke-Quiet 'docker' @('info')) -eq 0) }
function Ask-YesNo($question, $default) {
    $hint = if ($default) { '[O/n]' } else { '[o/N]' }
    $answer = Read-Host "    $question $hint"
    if ([string]::IsNullOrWhiteSpace($answer)) { return $default }
    $a = $answer.Trim().ToLower()
    return $a.StartsWith('o') -or $a.StartsWith('y')
}
function New-Secret($length) {
    $chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'.ToCharArray()
    $bytes = New-Object byte[] $length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}
# Values are written between single quotes: Docker reads them literally ($, # ...).
function EnvValue($value) { return "'" + $value + "'" }
# Start a program as the normal user even from this administrator window
# (Docker Desktop and the browser must not run as administrator).
function Start-AsUser($target) { Start-Process explorer.exe -ArgumentList "`"$target`"" }
# The person sitting at the computer (also correct inside an administrator window).
function Get-ConsoleUser {
    try { $u = (Get-CimInstance Win32_ComputerSystem).UserName; if ($u) { return $u } } catch { }
    return [Security.Principal.WindowsIdentity]::GetCurrent().Name
}
function Test-FeatureEnabled($name) {
    $f = Get-CimInstance Win32_OptionalFeature -Filter "Name='$name'" -ErrorAction SilentlyContinue
    return ($f -and $f.InstallState -eq 1)
}

try { Start-Transcript -Path $LogFile -Append | Out-Null } catch { $LogFile = '(journal indisponible)' }

Write-Host '==============================================' -ForegroundColor Cyan
Write-Host '  Installation - Reservations' -ForegroundColor Cyan
Write-Host '==============================================' -ForegroundColor Cyan
Info ("PowerShell {0}, Windows {1}, administrateur : {2}" -f $PSVersionTable.PSVersion, [Environment]::OSVersion.Version, (Test-Admin))

if (-not (Test-Path (Join-Path $Source 'docker-compose.yml'))) {
    Fail "lancez install.bat depuis le dossier de l'application (docker-compose.yml introuvable)."
}
# Files downloaded from internet (GitHub ZIP) are marked "blocked" by Windows:
# remove the mark so the .bat files and shortcuts open without warnings.
Get-ChildItem -Path $Source -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue

# --- 0. Checks before changing anything --------------------------------------------
Step "Verification de l'ordinateur"
$env:Path = "$DockerBin;$env:Path"
$dockerInstalled = Test-Path $DockerExe

$build = [Environment]::OSVersion.Version.Build
if (-not [Environment]::Is64BitOperatingSystem) { Fail 'Windows 64 bits est necessaire (Docker ne fonctionne pas sur Windows 32 bits).' }
if (-not $dockerInstalled -and $build -lt 19045) {
    Fail "Windows trop ancien (version $build). Docker Desktop demande Windows 10 22H2 (19045) ou Windows 11. Faites les mises a jour Windows puis relancez install.bat."
}
Ok "Windows compatible (version $build)."

$cs = Get-CimInstance Win32_ComputerSystem
$ramGb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)
if ($ramGb -lt 4) { Warn "seulement $ramGb Go de memoire : l'application risque d'etre lente (4 Go minimum, 8 Go conseilles)." }
else { Ok "Memoire : $ramGb Go." }

$drive = Get-PSDrive -Name ([IO.Path]::GetPathRoot($InstallDir).Substring(0, 1)) -ErrorAction SilentlyContinue
$sysDrive = Get-PSDrive -Name $env:SystemDrive.Substring(0, 1)
$needGb = if ($dockerInstalled) { 5 } else { 12 }
foreach ($d in @($sysDrive, $drive) | Where-Object { $_ } | Sort-Object Name -Unique) {
    $freeGb = [math]::Round($d.Free / 1GB, 1)
    if ($freeGb -lt $needGb) { Fail "pas assez d'espace sur le disque $($d.Name): ($freeGb Go libres, $needGb Go necessaires). Liberez de la place puis relancez install.bat." }
}
Ok 'Espace disque suffisant.'

# Docker needs the processor's virtualization (Intel VT-x / AMD-V), switched on in the BIOS.
if (-not $cs.HypervisorPresent) {
    $virt = (Get-CimInstance Win32_Processor | Select-Object -First 1).VirtualizationFirmwareEnabled
    if ($virt -eq $false) {
        Fail ("la virtualisation est desactivee dans le BIOS de l'ordinateur. Redemarrez, entrez dans le BIOS " +
            '(touche F2, F10, Suppr ou Echap au demarrage), activez "Intel Virtualization Technology (VT-x)" ou ' +
            '"SVM Mode" (AMD), enregistrez, puis relancez install.bat.')
    }
}
Ok 'Virtualisation disponible.'

# Port 3000 must be free, unless it is this application (re-installation / update).
$busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($busy) {
    $owner = (Get-Process -Id $busy.OwningProcess -ErrorAction SilentlyContinue).ProcessName
    if ($owner -notmatch 'docker|wslrelay|vpnkit|com\.docker') {
        Fail "le port $Port est deja utilise par le programme `"$owner`". Fermez-le (ou desinstallez-le) puis relancez install.bat."
    }
}
Ok "Port $Port disponible."

# --- 1. WSL 2 and Docker Desktop -------------------------------------------------------
Step 'Docker Desktop'
$needsReboot = $false

if (-not $dockerInstalled) {
    Restart-AsAdmin 'Installation de Docker Desktop'

    Step 'Activation de WSL 2 (necessaire pour Docker)'
    foreach ($feature in 'Microsoft-Windows-Subsystem-Linux', 'VirtualMachinePlatform') {
        if (Test-FeatureEnabled $feature) {
            Ok "$feature deja active."
        } else {
            $code = Invoke-Quiet 'dism.exe' @('/online', '/enable-feature', "/featurename:$feature", '/all', '/norestart')
            if ($code -notin 0, 3010) { Fail "activation de $feature impossible (code $code)." }
            Ok "$feature active."
            $needsReboot = $true
        }
    }

    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'amd64' }
    $url = "https://desktop.docker.com/win/main/$arch/Docker%20Desktop%20Installer.exe"
    $installer = Join-Path $env:TEMP 'DockerDesktopInstaller.exe'
    Step 'Telechargement de Docker Desktop (environ 600 Mo, internet necessaire)'
    $downloaded = $false
    foreach ($attempt in 1..3) {
        try {
            Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $installer
            if ((Get-Item $installer).Length -gt 100MB) { $downloaded = $true; break }
            Warn "fichier incomplet, nouvel essai ($attempt/3)..."
        } catch {
            Warn "telechargement interrompu ($($_.Exception.Message)), nouvel essai ($attempt/3)..."
            Start-Sleep -Seconds 5
        }
    }
    if (-not $downloaded) { Fail 'telechargement de Docker Desktop impossible. Verifiez la connexion internet puis relancez install.bat.' }
    Ok 'Telechargement termine.'

    Step 'Installation de Docker Desktop (quelques minutes)'
    $p = Start-Process $installer -ArgumentList 'install', '--quiet', '--accept-license', '--backend=wsl-2' -Wait -PassThru
    if ($p.ExitCode -notin 0, 3010) { Fail "l'installation de Docker Desktop a echoue (code $($p.ExitCode))." }
    Remove-Item $installer -ErrorAction SilentlyContinue
    if ($p.ExitCode -eq 3010) { $needsReboot = $true }

    # The person using the computer must be in docker-users to use Docker.
    $null = Invoke-Quiet 'net.exe' @('localgroup', 'docker-users', (Get-ConsoleUser), '/add')
    Ok 'Docker Desktop installe.'
    $needsReboot = $true   # group membership and WSL need a new Windows session
}

if ($needsReboot) {
    Write-Host ''
    Write-Host '==============================================' -ForegroundColor Yellow
    Write-Host '  Premiere partie terminee.' -ForegroundColor Yellow
    Write-Host '  REDEMARREZ l''ordinateur, puis relancez install.bat' -ForegroundColor Yellow
    Write-Host '  pour terminer l''installation.' -ForegroundColor Yellow
    Write-Host '==============================================' -ForegroundColor Yellow
    Finish 0
}
Ok 'Docker Desktop est installe.'

# Start with Windows (Docker Desktop setting; the file name depends on the version).
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
    Info 'Demarrage de Docker Desktop (la premiere fois : jusqu''a quelques minutes)...'
    Start-AsUser $DockerExe
    $start = Get-Date
    $wslUpdated = $false
    while (-not (Test-Docker)) {
        $elapsed = ((Get-Date) - $start).TotalSeconds
        # A missing or old WSL kernel is the usual reason Docker does not start.
        if (-not $wslUpdated -and $elapsed -gt 90) {
            Info 'Mise a jour de WSL...'
            $null = Invoke-Quiet 'wsl.exe' @('--update')
            $wslUpdated = $true
        }
        if ($elapsed -gt 420) {
            Fail ('Docker ne demarre pas. Ouvrez Docker Desktop (icone sur le bureau ou menu Demarrer) : ' +
                'acceptez les conditions ou la mise a jour WSL s''il le demande, attendez "Engine running", ' +
                'puis relancez install.bat. Si rien ne change, redemarrez l''ordinateur.')
        }
        Start-Sleep -Seconds 5
    }
}
Ok 'Docker fonctionne.'

# --- 2. Copy the application -------------------------------------------------------------
Step "Copie de l'application dans $InstallDir"
$sameFolder = (Resolve-Path $Source).Path.TrimEnd('\') -ieq [IO.Path]::GetFullPath($InstallDir).TrimEnd('\')
if ($sameFolder) {
    Ok "L'application est deja dans ce dossier."
} else {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
    # Development files are not copied: libraries, local database, git, builds, logs.
    $code = Invoke-Quiet 'robocopy.exe' @($Source, $InstallDir, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:2', '/W:2',
        '/XD', 'node_modules', '.venv', '.git', 'dist', '__pycache__', 'staticfiles', (Join-Path $Source 'backend\data'), (Join-Path $Source 'backups'),
        '/XF', '.env', '*.pyc', '*.sqlite3', '*.log', 'install-log.txt')
    if ($code -ge 8) { Fail "copie impossible vers $InstallDir (robocopy code $code)." }
    New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir 'backups') | Out-Null
    Ok 'Fichiers copies.'
}
# Created as administrator, the folder would be read-only for the normal Windows
# session: give the local users write access (backups, updates). S-1-5-32-545 = Users.
$null = Invoke-Quiet 'icacls.exe' @($InstallDir, '/grant', '*S-1-5-32-545:(OI)(CI)M', '/T', '/C', '/Q')
Set-Location $InstallDir

# --- 3. .env file -------------------------------------------------------------------------
Step 'Configuration (.env)'
$envFile = Join-Path $InstallDir '.env'
if (Test-Path $envFile) {
    Ok 'Fichier .env existant conserve (mots de passe inchanges).'
} else {
    if (-not $AdminUser) {
        $AdminUser = Read-Host "    Nom d'utilisateur de l'administrateur [admin]"
        if ([string]::IsNullOrWhiteSpace($AdminUser)) { $AdminUser = 'admin' }
    }
    $AdminUser = $AdminUser.Trim()
    if ($AdminUser -notmatch '^[\w.@+-]+$') { Fail "nom d'utilisateur invalide (lettres, chiffres et . @ + - _ seulement, sans espace)." }

    while (-not $AdminPassword) {
        $p1 = Read-Host '    Mot de passe de l''administrateur (8 caracteres minimum, rien ne s''affiche)' -AsSecureString
        $p2 = Read-Host '    Confirmez le mot de passe' -AsSecureString
        $t1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1))
        $t2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2))
        if ($t1 -ne $t2) { Write-Host '    Les deux mots de passe sont differents, recommencez.' -ForegroundColor Yellow }
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

# --- 4. Access from the other computers of the network (optional) ------------------------
Step 'Acces depuis les autres ordinateurs du reseau'
$envText = Get-Content $envFile -Raw
if ($envText -match '(?m)^DJANGO_ALLOWED_HOSTS=') {
    Ok 'Deja configure (voir DJANGO_ALLOWED_HOSTS dans .env).'
} else {
    $wantLan = if ($LanAccess) { $LanAccess -eq 'Oui' } else { Ask-YesNo 'Utiliser l''application aussi depuis d''autres ordinateurs ou telephones du reseau ?' $false }
    if ($wantLan) {
        # Administrator rights first (firewall): a relaunched copy redoes this step from the start.
        $LanAccess = 'Oui'
        Restart-AsAdmin 'Ouverture du pare-feu'
        $ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -notmatch 'WSL|vEthernet|Docker|Loopback' } |
            Select-Object -ExpandProperty IPAddress -Unique)
        $hosts = @('localhost', '127.0.0.1', 'backend', $env:COMPUTERNAME.ToLower()) + $ips
        $origins = @('localhost', '127.0.0.1', $env:COMPUTERNAME.ToLower()) + $ips | ForEach-Object { "http://${_}:$Port" }
        [IO.File]::AppendAllText($envFile, ("`r`n# Acces depuis le reseau local (ajoute par install.ps1).`r`n" +
            "DJANGO_ALLOWED_HOSTS=$($hosts -join ',')`r`n" +
            "DJANGO_CSRF_TRUSTED_ORIGINS=$($origins -join ',')`r`n"), (New-Object Text.UTF8Encoding $false))
        if (-not (Get-NetFirewallRule -DisplayName 'Reservations (port 3000)' -ErrorAction SilentlyContinue)) {
            New-NetFirewallRule -DisplayName 'Reservations (port 3000)' -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Private, Domain | Out-Null
        }
        Ok 'Acces reseau autorise. Adresses a utiliser sur les autres appareils :'
        foreach ($ip in $ips) { Info "      http://${ip}:$Port" }
        Info "      http://$($env:COMPUTERNAME.ToLower()):$Port"
        Info '(le reseau Wi-Fi/Ethernet doit etre de type "Prive" dans Windows)'
    } else {
        Ok 'Acces limite a cet ordinateur.'
    }
}

# --- 5. Build and start ----------------------------------------------------------------------
Step "Construction de l'application (la premiere fois : 5 a 15 minutes selon internet)"
$built = $false
foreach ($attempt in 1..3) {
    if ((Invoke-Shown 'docker' @('compose', 'build')) -eq 0) { $built = $true; break }
    Warn "construction interrompue (souvent un probleme de connexion), nouvel essai ($attempt/3)..."
    Start-Sleep -Seconds 10
}
if (-not $built) { Fail "la construction a echoue. Verifiez la connexion internet puis relancez install.bat." }
Ok 'Application construite.'

Step "Demarrage de l'application"
if ((Invoke-Shown 'docker' @('compose', 'up', '-d', '--wait', '--wait-timeout', '300')) -ne 0) {
    $null = Invoke-Shown 'docker' @('compose', 'logs', '--tail', '40', 'backend')
    Fail "l'application n'a pas demarre (voir les lignes ci-dessus, et : docker compose logs backend dans $InstallDir)."
}

# Final check: the application really answers.
$healthy = $false
foreach ($i in 1..30) {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$Port/api/health/" -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $healthy = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if (-not $healthy) { Fail "l'application ne repond pas sur http://localhost:$Port (voir : docker compose logs dans $InstallDir)." }
Ok "Application demarree et verifiee : http://localhost:$Port"

# --- 6. Desktop shortcuts ------------------------------------------------------------------------
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
Write-Host '  Connexion : le nom et le mot de passe choisis' -ForegroundColor Green
Write-Host '  pendant cette installation.' -ForegroundColor Green
Write-Host '==============================================' -ForegroundColor Green
if (-not $NoBrowser) { Start-AsUser "http://localhost:$Port" }
Finish 0

# WHAT  Windows twin of instalar.sh: prepares the computer to edit videos without any admin
#       password or system window. Portable Node, a static ffmpeg/ffprobe and Python
#       (through uv) with faster-whisper go into the plugin data folder; the Remotion
#       dependencies go into the Estúdio folder.
# WHY   The Criadora cannot type a password or answer an OS prompt from the Claude Desktop
#       Code tab, and must never be sent to a package manager. Claude Code deletes the plugin
#       data folder on uninstall, so the computer is left clean. Files fetched with
#       Invoke-WebRequest carry no "downloaded from the internet" mark, so Windows shows no
#       warning when they run.
# WHEN  Only after the Criadora says yes to the Diretor's preparation question. Safe to
#       re-run: every step that is already done is skipped without downloading anything.
# HOW   powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1 -Passo <node|ffmpeg|python|remotion|tudo> -Dados "<plugin data folder>" [-Estudio "<Estúdio folder>"]
#       -ExecutionPolicy Bypass applies to this one process only and needs no admin rights.
#       Prints progress in plain Portuguese. Exit 0 when ready, 1 when a step failed
#       (nothing half-installed stays behind), 2 on a usage error.
param(
  [string]$Passo,
  [string]$Dados,
  [string]$Estudio = (Get-Location).Path
)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ProgressPreference = 'SilentlyContinue' # the progress bar slows downloads tenfold
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if ($Passo -notin @('node', 'ffmpeg', 'python', 'remotion', 'tudo') -or -not $Dados) {
  [Console]::Error.WriteLine('uso: instalar.ps1 -Passo <node|ffmpeg|python|remotion|tudo> -Dados "<pasta de dados>" [-Estudio "<pasta do Estúdio>"]')
  exit 2
}
. (Join-Path $PSScriptRoot 'lib\ferramentas.ps1')

# Node, uv and Python are pinned: a re-run months later installs the same, tested programs.
# ffmpeg follows its 9.0 release branch (BtbN rebuilds it; martin-riedl on macOS serves its
# latest release), because neither host keeps a fixed per-version download link.
$NodeVersao = 'v22.23.3'
$UvVersao = '0.12.21'
$PythonVersao = '3.12'
$FfmpegRamo = '9.0' # BtbN release branch n9.0
$Arm = $env:PROCESSOR_ARCHITECTURE -eq 'ARM64'

$Tmp = Join-Path $Dados 'tmp'

function Falha([string]$Oque) {
  "Não consegui $Oque. Confira a internet e tente de novo: o que já estava pronto continua pronto."
  Remove-Item -LiteralPath $Tmp -Recurse -Force -ErrorAction SilentlyContinue
  exit 1
}

function NovoTmp([string]$Nome) {
  $pasta = Join-Path $Tmp $Nome
  Remove-Item -LiteralPath $pasta -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $pasta -Force | Out-Null
  $pasta
}

function Baixa([string]$Url, [string]$Arquivo) {
  try { Invoke-WebRequest -Uri $Url -OutFile $Arquivo -UseBasicParsing; $true } catch { $false }
}

function Abre([string]$Zip, [string]$Destino) {
  try { Expand-Archive -LiteralPath $Zip -DestinationPath $Destino -Force; $true } catch { $false }
}

# Moves a finished folder into runtime\, replacing a broken earlier attempt.
function Guarda([string]$Pronta, [string]$Nome) {
  $final = Join-Path $Runtime $Nome
  try {
    New-Item -ItemType Directory -Path $Runtime -Force | Out-Null
    Remove-Item -LiteralPath $final -Recurse -Force -ErrorAction SilentlyContinue
    Move-Item -LiteralPath $Pronta -Destination $final
    $true
  } catch { $false }
}

# The only folder inside an unpacked archive.
function Unica([string]$Pasta) { (Get-ChildItem -LiteralPath $Pasta -Directory | Select-Object -First 1).FullName }

function InstalaNode {
  if (AchaNode) { 'Node: já estava pronto.'; return }
  'Node (o programa que monta as animações): baixando cerca de 30 MB…'
  $arq = if ($Arm) { 'arm64' } else { 'x64' }
  $t = NovoTmp 'node'
  if (-not (Baixa "https://nodejs.org/dist/$NodeVersao/node-$NodeVersao-win-$arq.zip" "$t\node.zip")) { Falha 'baixar o Node' }
  if (-not (Abre "$t\node.zip" "$t\x")) { Falha 'abrir o Node' }
  if (-not (Guarda (Unica "$t\x") 'node')) { Falha 'guardar o Node' }
  if (-not (Funciona $NodePortatil @('--version'))) { Falha 'fazer o Node funcionar' }
  'Node: pronto.'
}

function InstalaFfmpeg {
  if ((AchaFfmpeg) -and (AchaFfprobe)) { 'ffmpeg: já estava pronto.'; return }
  'ffmpeg (o programa que lê e grava vídeo): baixando cerca de 200 MB…'
  $arq = if ($Arm) { 'winarm64' } else { 'win64' }
  $t = NovoTmp 'ffmpeg'
  $url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n$FfmpegRamo-latest-$arq-gpl-$FfmpegRamo.zip"
  if (-not (Baixa $url "$t\ffmpeg.zip")) { Falha 'baixar o ffmpeg' }
  if (-not (Abre "$t\ffmpeg.zip" "$t\x")) { Falha 'abrir o ffmpeg' }
  $pronta = NovoTmp 'ffmpeg-pronto'
  try {
    foreach ($exe in 'ffmpeg.exe', 'ffprobe.exe') { Move-Item -LiteralPath (Join-Path (Unica "$t\x") "bin\$exe") -Destination $pronta }
  } catch { Falha 'abrir o ffmpeg' }
  if (-not (Guarda $pronta 'ffmpeg')) { Falha 'guardar o ffmpeg' }
  if (-not ((Funciona $FfmpegPortatil @('-version')) -and (Funciona $FfprobePortatil @('-version')))) { Falha 'fazer o ffmpeg funcionar' }
  'ffmpeg: pronto.'
}

function InstalaPython {
  if (AchaPython) { 'Python com faster-whisper: já estava pronto.'; return }
  'Python com faster-whisper (a transcrição das suas falas): baixando cerca de 150 MB…'
  $uv = Join-Path $Runtime 'uv\uv.exe'
  if (-not (Funciona $uv @('--version'))) {
    $arq = if ($Arm) { 'aarch64' } else { 'x86_64' }
    $t = NovoTmp 'uv'
    if (-not (Baixa "https://github.com/astral-sh/uv/releases/download/$UvVersao/uv-$arq-pc-windows-msvc.zip" "$t\uv.zip")) { Falha 'baixar o Python' }
    if (-not (Abre "$t\uv.zip" "$t\x")) { Falha 'abrir o Python' }
    if (-not (Guarda "$t\x" 'uv')) { Falha 'guardar o Python' }
  }
  # Everything uv downloads or caches stays in the plugin data folder.
  $env:UV_CACHE_DIR = Join-Path $Dados 'cache\uv'
  $env:UV_PYTHON_INSTALL_DIR = Join-Path $Runtime 'uv-python'
  $env:UV_PYTHON_BIN_DIR = Join-Path $Runtime 'uv-python\bin'
  $env:UV_PYTHON_PREFERENCE = 'only-managed'
  $env:UV_NO_CONFIG = '1'
  $env:UV_NO_PROGRESS = '1'
  $venv = Join-Path $Runtime 'python'
  Remove-Item -LiteralPath $venv -Recurse -Force -ErrorAction SilentlyContinue
  & $uv venv --quiet --python $PythonVersao $venv 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath $venv -Recurse -Force -ErrorAction SilentlyContinue; Falha 'baixar o Python' }
  # PyAV 19 dropped an argument faster-whisper 1.2.1 still passes: every transcription fails.
  & $uv pip install --quiet --python $PythonPortatil 'faster-whisper==1.2.1' 'av<19' 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0 -or -not (AchaPython)) {
    Remove-Item -LiteralPath $venv -Recurse -Force -ErrorAction SilentlyContinue
    Falha 'baixar o faster-whisper'
  }
  'Python com faster-whisper: pronto.'
}

function InstalaRemotion {
  switch (EstadoRemotion $Estudio) {
    'ok' { 'Remotion: já estava pronto.'; return }
    'not-an-estudio' {
      if ($Passo -eq 'tudo') { 'Remotion: fica para quando esta pasta virar o seu Estúdio.'; return }
      [Console]::Error.WriteLine('Remotion: esta pasta ainda não é um Estúdio.'); exit 2
    }
  }
  $node = AchaNode
  if (-not $node) { Falha 'preparar o Remotion, porque o Node ainda não está pronto' }
  'Remotion (o editor de animações), dentro da pasta do Estúdio: baixando cerca de 250 MB…'
  $nodeDir = Split-Path -Parent $node
  $npmCli = Join-Path $nodeDir 'node_modules\npm\bin\npm-cli.js'
  $env:Path = "$nodeDir;$env:Path"
  $env:npm_config_cache = Join-Path $Dados 'cache\npm'
  $env:npm_config_update_notifier = 'false'
  $env:npm_config_fund = 'false'
  $env:npm_config_audit = 'false'
  Push-Location -LiteralPath $Estudio
  try {
    if (Test-Path -LiteralPath $npmCli) { & $node $npmCli install --loglevel=error 2>&1 | Out-Null }
    else { & npm install --loglevel=error 2>&1 | Out-Null }
    $ok = $LASTEXITCODE -eq 0
  } catch { $ok = $false } finally { Pop-Location }
  if (-not $ok) { Falha 'baixar o Remotion' }
  if ((EstadoRemotion $Estudio) -ne 'ok') { Falha 'fazer o Remotion funcionar' }
  'Remotion: pronto.'
}

switch ($Passo) {
  'node' { InstalaNode }
  'ffmpeg' { InstalaFfmpeg }
  'python' { InstalaPython }
  'remotion' { InstalaRemotion }
  'tudo' {
    InstalaNode
    InstalaFfmpeg
    InstalaPython
    InstalaRemotion
    'Computador preparado para editar vídeos.'
  }
}
Remove-Item -LiteralPath $Tmp -Recurse -Force -ErrorAction SilentlyContinue
exit 0

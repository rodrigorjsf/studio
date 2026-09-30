# WHAT  Windows twin of instalar.sh: prepares the computer to edit videos without any admin
#       password or system window. Portable Node, a static ffmpeg/ffprobe and Python
#       (through uv) with faster-whisper and the speech model (~1.6 GB, from our GitHub
#       Release) go into the plugin data folder; the Remotion dependencies go into the
#       Estúdio folder.
# WHY   The Criadora cannot type a password or answer an OS prompt from the Claude Desktop
#       Code tab, and must never be sent to a package manager. Claude Code deletes the plugin
#       data folder on uninstall, so the computer is left clean. Files fetched with
#       Invoke-WebRequest carry no "downloaded from the internet" mark, so Windows shows no
#       warning when they run.
# WHEN  Only after the Criadora says yes to the Diretor's preparation question. Safe to
#       re-run: every step that is already done is skipped without downloading anything.
# HOW   powershell -NoProfile -ExecutionPolicy Bypass -File instalar.ps1 -Step <node|ffmpeg|python|modelo|remotion|tudo> -DataDir "<plugin data folder>" [-Estudio "<Estúdio folder>"]
#       -ExecutionPolicy Bypass applies to this one process only and needs no admin rights.
#       `modelo` downloads the speech model's files listed in ..\vendor.json into
#       <plugin data folder>\modelos\large-v3-turbo\, verifies each sha256, deletes and reports
#       any file that fails, and skips files already verified. While a file downloads it prints
#       how many MB arrived every 15 s (ESTUDIO_PROGRESS_SECONDS changes the interval), and a
#       file cut halfway is continued by the next run instead of starting again.
#       ESTUDIO_MODEL_MANIFEST points it at another manifest (tests serve local file:// URLs);
#       real downloads need the network.
#       Prints progress in plain Portuguese. Exit 0 when ready, 1 when a step failed
#       (nothing half-installed stays behind; only a model file cut halfway waits in partial\
#       for the next run to continue it), 2 on a usage error.
param(
  [string]$Step,
  [string]$DataDir,
  [string]$Estudio = (Get-Location).Path
)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ProgressPreference = 'SilentlyContinue' # the progress bar slows downloads tenfold
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if ($Step -notin @('node', 'ffmpeg', 'python', 'modelo', 'remotion', 'tudo') -or -not $DataDir) {
  [Console]::Error.WriteLine('uso: instalar.ps1 -Step <node|ffmpeg|python|modelo|remotion|tudo> -DataDir "<pasta de dados>" [-Estudio "<pasta do Estúdio>"]')
  exit 2
}
. (Join-Path $PSScriptRoot 'lib\ferramentas.ps1')

# Every host this script reaches (and the ones uv and npm reach for it) is in ..\hosts.json,
# the list the Diretor hands the Criadora when her cloud workspace blocks a download. Add a
# host there when a URL here gains one.
# Node, uv and Python are pinned: a re-run months later installs the same, tested programs.
# ffmpeg follows its 9.0 release branch (BtbN rebuilds it; martin-riedl on macOS serves its
# latest release), because neither host keeps a fixed per-version download link.
$NodeVersion = 'v22.23.3'
$UvVersion = '0.12.21'
$PythonVersion = '3.12'
$FfmpegBranch = '9.0' # BtbN release branch n9.0
$Arm = $env:PROCESSOR_ARCHITECTURE -eq 'ARM64'

$Tmp = Join-Path $DataDir 'tmp'
$ProgressSeconds = if ($env:ESTUDIO_PROGRESS_SECONDS) { [int]$env:ESTUDIO_PROGRESS_SECONDS } else { 15 }

function Fail([string]$What) {
  "Não consegui $What. Confira a internet e tente de novo: o que já estava pronto continua pronto."
  Remove-Item -LiteralPath $Tmp -Recurse -Force -ErrorAction SilentlyContinue
  exit 1
}

function NewTmp([string]$Name) {
  $folder = Join-Path $Tmp $Name
  Remove-Item -LiteralPath $folder -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Path $folder -Force | Out-Null
  $folder
}

function Download([string]$Url, [string]$File) {
  try {
    # file:// is how the tests serve local fixtures; Invoke-WebRequest cannot read it.
    if ($Url -like 'file:*') { Copy-Item -LiteralPath ([Uri]$Url).LocalPath -Destination $File -Force -ErrorAction Stop }
    else { Invoke-WebRequest -Uri $Url -OutFile $File -UseBasicParsing }
    $true
  } catch { $false }
}

function Unzip([string]$Zip, [string]$Destination) {
  try { Expand-Archive -LiteralPath $Zip -DestinationPath $Destination -Force; $true } catch { $false }
}

# Moves a finished folder into runtime\, replacing a broken earlier attempt.
function Store([string]$Finished, [string]$Name) {
  $final = Join-Path $Runtime $Name
  try {
    New-Item -ItemType Directory -Path $Runtime -Force | Out-Null
    Remove-Item -LiteralPath $final -Recurse -Force -ErrorAction SilentlyContinue
    Move-Item -LiteralPath $Finished -Destination $final
    $true
  } catch { $false }
}

# The only folder inside an unpacked archive.
function OnlyChild([string]$Folder) { (Get-ChildItem -LiteralPath $Folder -Directory | Select-Object -First 1).FullName }

function InstallNode {
  if (FindNode) { 'Node: já estava pronto.'; return }
  'Node (o programa que monta as animações): baixando cerca de 30 MB…'
  $arch = if ($Arm) { 'arm64' } else { 'x64' }
  $t = NewTmp 'node'
  if (-not (Download "https://nodejs.org/dist/$NodeVersion/node-$NodeVersion-win-$arch.zip" "$t\node.zip")) { Fail 'baixar o Node' }
  if (-not (Unzip "$t\node.zip" "$t\x")) { Fail 'abrir o Node' }
  if (-not (Store (OnlyChild "$t\x") 'node')) { Fail 'guardar o Node' }
  if (-not (Works $PortableNode @('--version'))) { Fail 'fazer o Node funcionar' }
  'Node: pronto.'
}

function InstallFfmpeg {
  if ((FindFfmpeg) -and (FindFfprobe)) { 'ffmpeg: já estava pronto.'; return }
  'ffmpeg (o programa que lê e grava vídeo): baixando cerca de 200 MB…'
  $arch = if ($Arm) { 'winarm64' } else { 'win64' }
  $t = NewTmp 'ffmpeg'
  $url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n$FfmpegBranch-latest-$arch-gpl-$FfmpegBranch.zip"
  if (-not (Download $url "$t\ffmpeg.zip")) { Fail 'baixar o ffmpeg' }
  if (-not (Unzip "$t\ffmpeg.zip" "$t\x")) { Fail 'abrir o ffmpeg' }
  $ready = NewTmp 'ffmpeg-ready'
  try {
    foreach ($exe in 'ffmpeg.exe', 'ffprobe.exe') { Move-Item -LiteralPath (Join-Path (OnlyChild "$t\x") "bin\$exe") -Destination $ready }
  } catch { Fail 'abrir o ffmpeg' }
  if (-not (Store $ready 'ffmpeg')) { Fail 'guardar o ffmpeg' }
  if (-not ((Works $PortableFfmpeg @('-version')) -and (Works $PortableFfprobe @('-version')))) { Fail 'fazer o ffmpeg funcionar' }
  'ffmpeg: pronto.'
}

function InstallPython {
  if (FindPython) { 'Python com faster-whisper: já estava pronto.'; return }
  'Python com faster-whisper (a transcrição das suas falas): baixando cerca de 150 MB…'
  $uv = Join-Path $Runtime 'uv\uv.exe'
  if (-not (Works $uv @('--version'))) {
    $arch = if ($Arm) { 'aarch64' } else { 'x86_64' }
    $t = NewTmp 'uv'
    if (-not (Download "https://github.com/astral-sh/uv/releases/download/$UvVersion/uv-$arch-pc-windows-msvc.zip" "$t\uv.zip")) { Fail 'baixar o Python' }
    if (-not (Unzip "$t\uv.zip" "$t\x")) { Fail 'abrir o Python' }
    if (-not (Store "$t\x" 'uv')) { Fail 'guardar o Python' }
  }
  # Everything uv downloads or caches stays in the plugin data folder.
  $env:UV_CACHE_DIR = Join-Path $DataDir 'cache\uv'
  $env:UV_PYTHON_INSTALL_DIR = Join-Path $Runtime 'uv-python'
  $env:UV_PYTHON_BIN_DIR = Join-Path $Runtime 'uv-python\bin'
  $env:UV_PYTHON_PREFERENCE = 'only-managed'
  $env:UV_NO_CONFIG = '1'
  $env:UV_NO_PROGRESS = '1'
  $venv = Join-Path $Runtime 'python'
  Remove-Item -LiteralPath $venv -Recurse -Force -ErrorAction SilentlyContinue
  & $uv venv --quiet --python $PythonVersion $venv 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { Remove-Item -LiteralPath $venv -Recurse -Force -ErrorAction SilentlyContinue; Fail 'baixar o Python' }
  # PyAV 19 dropped an argument faster-whisper 1.2.1 still passes: every transcription fails.
  & $uv pip install --quiet --python $PortablePython 'faster-whisper==1.2.1' 'av<19' 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0 -or -not (FindPython)) {
    Remove-Item -LiteralPath $venv -Recurse -Force -ErrorAction SilentlyContinue
    Fail 'baixar o faster-whisper'
  }
  'Python com faster-whisper: pronto.'
}

# Downloads Url into Partial, continuing the partial file an interrupted run left, and prints a
# progress line every $ProgressSeconds so a download of minutes never looks frozen. file:// (how
# the tests serve fixtures) is read the same way, from the same offset. A server that cannot
# continue (HTTP 416) restarts the file once. Progress goes straight to the console, because
# anything a function outputs would become part of its return value.
function FetchModelFile([string]$Url, [string]$Partial, [bool]$Again = $false) {
  $name = Split-Path -Leaf $Partial
  $offset = 0L
  if (Test-Path -LiteralPath $Partial -PathType Leaf) { $offset = (Get-Item -LiteralPath $Partial).Length }
  $response = $null; $in = $null; $out = $null
  try {
    $append = $false
    if ($Url -like 'file:*') {
      $in = [IO.File]::OpenRead(([Uri]$Url).LocalPath)
      if ($offset -gt 0 -and $offset -le $in.Length) { [void]$in.Seek($offset, [IO.SeekOrigin]::Begin); $append = $true }
    } else {
      $request = [Net.HttpWebRequest]::Create($Url)
      if ($offset -gt 0) { $request.AddRange($offset) }
      try { $response = $request.GetResponse() }
      catch {
        $e = $_.Exception
        while ($e -and -not ($e -is [Net.WebException])) { $e = $e.InnerException }
        if (-not $Again -and $e -and $e.Response -and [int]$e.Response.StatusCode -eq 416) {
          Remove-Item -LiteralPath $Partial -Force -ErrorAction SilentlyContinue
          return (FetchModelFile $Url $Partial $true)
        }
        return $false
      }
      $append = $offset -gt 0 -and [int]$response.StatusCode -eq 206
      $in = $response.GetResponseStream()
    }
    $mode = if ($append) { [IO.FileMode]::Append } else { [IO.FileMode]::Create }
    $out = [IO.File]::Open($Partial, $mode, [IO.FileAccess]::Write)
    $buffer = New-Object byte[] 1048576
    $clock = [Diagnostics.Stopwatch]::StartNew()
    while (($read = $in.Read($buffer, 0, $buffer.Length)) -gt 0) {
      $out.Write($buffer, 0, $read)
      if ($clock.Elapsed.TotalSeconds -ge $ProgressSeconds) {
        [Console]::Out.WriteLine("    ${name}: $([math]::Floor($out.Length / 1MB)) MB baixados até agora…")
        $clock.Restart()
      }
    }
    $true
  } catch { $false }
  finally {
    if ($out) { $out.Dispose() }
    if ($in) { $in.Dispose() }
    if ($response) { $response.Close() }
  }
}

# The speech model comes from our own GitHub Release, never from Hugging Face. Each file lands in
# the model folder only after its sha256 matches the manifest. A download cut halfway waits in
# partial\speech-model\ and the next run continues it from where it stopped, so a slow link that
# needs several runs still gets through the ~1.6 GB model.bin.
function InstallModel {
  $files = @(ModelFiles)
  if ($files.Count -eq 0) { Fail 'ler a lista de arquivos do modelo de fala' }
  $pending = @($files | Where-Object {
    $destination = Join-Path $ModelDir $_.name
    -not ((Test-Path -LiteralPath $destination -PathType Leaf) -and ((Sha256Of $destination) -eq $_.sha256))
  })
  if ($pending.Count -eq 0) { 'Modelo de fala: já estava pronto.'; return }
  'Modelo de fala (o que entende as suas falas, baixado uma só vez): baixando cerca de 1,6 GB, pode levar alguns minutos…'
  try {
    New-Item -ItemType Directory -Path $ModelDir -Force | Out-Null
    New-Item -ItemType Directory -Path $ModelPartialDir -Force | Out-Null
  } catch { Fail 'preparar o modelo de fala' }
  $partialRoot = Split-Path -Parent $ModelPartialDir
  $n = 0
  foreach ($file in $pending) {
    $n++
    $partial = Join-Path $ModelPartialDir $file.name
    $started = (Test-Path -LiteralPath $partial -PathType Leaf) -and (Get-Item -LiteralPath $partial).Length -gt 0
    if ($started) { "  ($n de $($pending.Count)) continuando $($file.name) de onde parou…" }
    else { "  ($n de $($pending.Count)) baixando $($file.name)…" }
    $destination = Join-Path $ModelDir $file.name
    Remove-Item -LiteralPath $destination -Force -ErrorAction SilentlyContinue
    if (-not $started -or (Sha256Of $partial) -ne $file.sha256) {
      if (-not (FetchModelFile $file.url $partial)) { Fail "baixar o arquivo $($file.name) do modelo de fala" }
    }
    if ((Sha256Of $partial) -ne $file.sha256) {
      Remove-Item -LiteralPath $partialRoot -Recurse -Force -ErrorAction SilentlyContinue # only this file was waiting there
      "O arquivo $($file.name) do modelo de fala chegou corrompido e foi apagado. Tente de novo: o que já estava pronto continua pronto."
      Remove-Item -LiteralPath $Tmp -Recurse -Force -ErrorAction SilentlyContinue
      exit 1
    }
    try { Move-Item -LiteralPath $partial -Destination $destination } catch { Fail "guardar o arquivo $($file.name) do modelo de fala" }
  }
  Remove-Item -LiteralPath $partialRoot -Recurse -Force -ErrorAction SilentlyContinue # empty: every file moved in
  'Modelo de fala: pronto.'
}

function InstallRemotion {
  switch (RemotionState $Estudio) {
    'ok' { 'Remotion: já estava pronto.'; return }
    'not-an-estudio' {
      if ($Step -eq 'tudo') { 'Remotion: fica para quando esta pasta virar o seu Estúdio.'; return }
      [Console]::Error.WriteLine('Remotion: esta pasta ainda não é um Estúdio.'); exit 2
    }
  }
  $node = FindNode
  if (-not $node) { Fail 'preparar o Remotion, porque o Node ainda não está pronto' }
  'Remotion (o editor de animações), dentro da pasta do Estúdio: baixando cerca de 250 MB…'
  $nodeDir = Split-Path -Parent $node
  $npmCli = Join-Path $nodeDir 'node_modules\npm\bin\npm-cli.js'
  $env:Path = "$nodeDir;$env:Path"
  $env:npm_config_cache = Join-Path $DataDir 'cache\npm'
  $env:npm_config_update_notifier = 'false'
  $env:npm_config_fund = 'false'
  $env:npm_config_audit = 'false'
  Push-Location -LiteralPath $Estudio
  try {
    if (Test-Path -LiteralPath $npmCli) { & $node $npmCli install --loglevel=error 2>&1 | Out-Null }
    else { & npm install --loglevel=error 2>&1 | Out-Null }
    $ok = $LASTEXITCODE -eq 0
  } catch { $ok = $false } finally { Pop-Location }
  if (-not $ok) { Fail 'baixar o Remotion' }
  if ((RemotionState $Estudio) -ne 'ok') { Fail 'fazer o Remotion funcionar' }
  'Remotion: pronto.'
}

switch ($Step) {
  'node' { InstallNode }
  'ffmpeg' { InstallFfmpeg }
  'python' { InstallPython }
  'modelo' { InstallModel }
  'remotion' { InstallRemotion }
  'tudo' {
    InstallNode
    InstallFfmpeg
    InstallPython
    InstallModel
    InstallRemotion
    'Computador preparado para editar vídeos.'
  }
}
Remove-Item -LiteralPath $Tmp -Recurse -Force -ErrorAction SilentlyContinue
exit 0

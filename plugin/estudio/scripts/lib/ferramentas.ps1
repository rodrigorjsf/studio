# Shared by verificar.ps1 and instalar.ps1 (Windows PowerShell 5.1 and later): where the
# portable runtimes live inside the plugin data folder and how to tell whether each tool
# works. Dot-source it after setting $Dados (the plugin data folder). The macOS/Linux twin
# is ferramentas.sh; the layout is the same, with Windows file names:
#   runtime\node\node.exe              portable Node (official zip)
#   runtime\ffmpeg\ffmpeg.exe|ffprobe.exe  static ffmpeg build
#   runtime\uv\uv.exe                  uv, which provides Python
#   runtime\uv-python\                 the Python interpreter uv downloads
#   runtime\python\Scripts\python.exe  a virtual environment holding faster-whisper
#   modelos\large-v3-turbo\            the speech model's files, downloaded by the Preparação
#   cache\uv, cache\npm                download caches
#   tmp\                               partial downloads, removed after each step
# Claude Code deletes the plugin data folder on uninstall, so nothing is left behind.

$Runtime = Join-Path $Dados 'runtime'
$NodePortatil = Join-Path $Runtime 'node\node.exe'
$FfmpegPortatil = Join-Path $Runtime 'ffmpeg\ffmpeg.exe'
$FfprobePortatil = Join-Path $Runtime 'ffmpeg\ffprobe.exe'
$PythonPortatil = Join-Path $Runtime 'python\Scripts\python.exe'

# The speech model: transcrever.py loads it from modelos\<model name> by path. The list of its
# files (name, sha256, download URL) is the `speech-model` source of vendor.json; the
# ESTUDIO_MODELO_MANIFESTO override points at another manifest, so tests can serve local files.
$ModeloNome = 'large-v3-turbo'
$ModeloPasta = Join-Path $Dados "modelos\$ModeloNome"
$ModeloManifesto = if ($env:ESTUDIO_MODELO_MANIFESTO) { $env:ESTUDIO_MODELO_MANIFESTO } else { Join-Path $PSScriptRoot '..\..\vendor.json' }

# The program exists and runs successfully.
function Funciona([string]$Programa, [string[]]$Argumentos) {
  if (-not $Programa -or -not (Test-Path -LiteralPath $Programa -PathType Leaf)) { return $false }
  try { & $Programa @Argumentos *> $null; return $LASTEXITCODE -eq 0 } catch { return $false }
}

# Programs on the computer's own PATH. The WindowsApps "python.exe" is a stub that opens
# the Microsoft Store, so it is never touched.
function NoPath([string]$Nome) {
  Get-Command $Nome -CommandType Application -ErrorAction SilentlyContinue |
    Where-Object { $_.Source -notlike '*\WindowsApps\*' } |
    Select-Object -First 1 -ExpandProperty Source
}

function Acha([string[]]$Candidatos, [string[]]$Argumentos) {
  foreach ($c in $Candidatos) { if (Funciona $c $Argumentos) { return $c } }
  return $null
}

function AchaNode { Acha @($NodePortatil, (NoPath 'node')) @('--version') }
function AchaFfmpeg { Acha @($FfmpegPortatil, (NoPath 'ffmpeg')) @('-version') }
function AchaFfprobe { Acha @($FfprobePortatil, (NoPath 'ffprobe')) @('-version') }
# Python counts only with faster-whisper installed.
function AchaPython {
  Acha @($PythonPortatil, (NoPath 'python')) @('-c', 'import importlib.util, sys; sys.exit(importlib.util.find_spec(''faster_whisper'') is None)')
}

# ok | missing | not-an-estudio
function EstadoRemotion([string]$Pasta) {
  if (-not (Test-Path -LiteralPath (Join-Path $Pasta 'estudio.json'))) { return 'not-an-estudio' }
  if ((Test-Path -LiteralPath (Join-Path $Pasta 'node_modules\remotion\package.json')) -and
      (Test-Path -LiteralPath (Join-Path $Pasta 'node_modules\@remotion\cli\package.json'))) { return 'ok' }
  return 'missing'
}

# The speech-model files of the manifest ({name, sha256, url}); none when it cannot be read.
function ModeloArquivos {
  try {
    $fonte = (Get-Content -LiteralPath $ModeloManifesto -Raw -Encoding UTF8 | ConvertFrom-Json).sources |
      Where-Object { $_.id -eq 'speech-model' } | Select-Object -First 1
    @($fonte.files | Where-Object { $_.name })
  } catch { @() }
}

# ok | missing. Missing when the manifest lists no file or any listed file is absent from the
# model folder. Presence only: hashing 1.6 GB at every session start is too slow; instalar.ps1
# verifies the sha256 of every file when it downloads or re-runs.
function EstadoModelo {
  $arquivos = @(ModeloArquivos)
  if ($arquivos.Count -eq 0) { return 'missing' }
  foreach ($arquivo in $arquivos) {
    if (-not (Test-Path -LiteralPath (Join-Path $ModeloPasta $arquivo.name) -PathType Leaf)) { return 'missing' }
  }
  return 'ok'
}

# The file's sha256, lowercase hex.
function Sha256De([string]$Arquivo) { (Get-FileHash -LiteralPath $Arquivo -Algorithm SHA256).Hash.ToLowerInvariant() }

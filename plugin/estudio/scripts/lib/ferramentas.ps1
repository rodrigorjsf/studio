# Shared by verificar.ps1 and instalar.ps1 (Windows PowerShell 5.1 and later): where the
# portable runtimes live inside the plugin data folder and how to tell whether each tool
# works. Dot-source it after setting $DataDir (the plugin data folder). The macOS/Linux twin
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

$Runtime = Join-Path $DataDir 'runtime'
$PortableNode = Join-Path $Runtime 'node\node.exe'
$PortableFfmpeg = Join-Path $Runtime 'ffmpeg\ffmpeg.exe'
$PortableFfprobe = Join-Path $Runtime 'ffmpeg\ffprobe.exe'
$PortablePython = Join-Path $Runtime 'python\Scripts\python.exe'

# The speech model: transcrever.py loads it from modelos\<model name> by path. The list of its
# files (name, sha256, download URL) is the `speech-model` source of vendor.json; the
# ESTUDIO_MODEL_MANIFEST override points at another manifest, so tests can serve local files.
$ModelName = 'large-v3-turbo'
$ModelDir = Join-Path $DataDir "modelos\$ModelName"
$ModelPartialDir = Join-Path $DataDir 'partial\speech-model' # a model file cut halfway, continued by the next run
$ModelManifest = if ($env:ESTUDIO_MODEL_MANIFEST) { $env:ESTUDIO_MODEL_MANIFEST } else { Join-Path $PSScriptRoot '..\..\vendor.json' }

# The program exists and runs successfully.
function Works([string]$Program, [string[]]$Arguments) {
  if (-not $Program -or -not (Test-Path -LiteralPath $Program -PathType Leaf)) { return $false }
  try { & $Program @Arguments *> $null; return $LASTEXITCODE -eq 0 } catch { return $false }
}

# Programs on the computer's own PATH. The WindowsApps "python.exe" is a stub that opens
# the Microsoft Store, so it is never touched.
function OnPath([string]$Name) {
  Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue |
    Where-Object { $_.Source -notlike '*\WindowsApps\*' } |
    Select-Object -First 1 -ExpandProperty Source
}

function FindWorking([string[]]$Candidates, [string[]]$Arguments) {
  foreach ($candidate in $Candidates) { if (Works $candidate $Arguments) { return $candidate } }
  return $null
}

function FindNode { FindWorking @($PortableNode, (OnPath 'node')) @('--version') }
function FindFfmpeg { FindWorking @($PortableFfmpeg, (OnPath 'ffmpeg')) @('-version') }
function FindFfprobe { FindWorking @($PortableFfprobe, (OnPath 'ffprobe')) @('-version') }
# Python counts only with faster-whisper installed.
function FindPython {
  FindWorking @($PortablePython, (OnPath 'python')) @('-c', 'import importlib.util, sys; sys.exit(importlib.util.find_spec(''faster_whisper'') is None)')
}

# ok | missing | not-an-estudio
function RemotionState([string]$Folder) {
  if (-not (Test-Path -LiteralPath (Join-Path $Folder 'estudio.json'))) { return 'not-an-estudio' }
  if ((Test-Path -LiteralPath (Join-Path $Folder 'node_modules\remotion\package.json')) -and
      (Test-Path -LiteralPath (Join-Path $Folder 'node_modules\@remotion\cli\package.json'))) { return 'ok' }
  return 'missing'
}

# The speech-model files of the manifest ({name, sha256, url}); none when it cannot be read.
function ModelFiles {
  try {
    $source = (Get-Content -LiteralPath $ModelManifest -Raw -Encoding UTF8 | ConvertFrom-Json).sources |
      Where-Object { $_.id -eq 'speech-model' } | Select-Object -First 1
    @($source.files | Where-Object { $_.name })
  } catch { @() }
}

# ok | missing. Missing when the manifest lists no file or any listed file is absent from the
# model folder. Presence only: hashing 1.6 GB at every session start is too slow; instalar.ps1
# verifies the sha256 of every file when it downloads or re-runs.
function ModelState {
  $files = @(ModelFiles)
  if ($files.Count -eq 0) { return 'missing' }
  foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath (Join-Path $ModelDir $file.name) -PathType Leaf)) { return 'missing' }
  }
  return 'ok'
}

# The file's sha256, lowercase hex.
function Sha256Of([string]$File) { (Get-FileHash -LiteralPath $File -Algorithm SHA256).Hash.ToLowerInvariant() }

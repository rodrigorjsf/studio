# WHAT  Windows twin of verificar.sh: checks Node, ffmpeg, ffprobe, Python with
#       faster-whisper, the speech model's files and (inside an Estúdio) the Remotion
#       dependencies. Never installs.
# WHY   The session-start hook and the estudio skill must know what is missing before the
#       Diretor asks the one preparation question.
# WHEN  At every session start on Windows (hooks/hooks.json) and whenever the skill needs
#       the paths of the tools.
# HOW   powershell -NoProfile -ExecutionPolicy Bypass -File verificar.ps1 [-Json] [-DataDir <folder>] [-Estudio <folder>]
#       Defaults: $env:CLAUDE_PLUGIN_DATA and $env:CLAUDE_PROJECT_DIR (else the current
#       folder). Same output as verificar.sh. Always exits 0.
param(
  [switch]$Json,
  [string]$DataDir = $env:CLAUDE_PLUGIN_DATA,
  [string]$Estudio = $(if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path })
)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
if (-not $DataDir) { $DataDir = Join-Path $env:TEMP 'estudio-no-data' }
. (Join-Path $PSScriptRoot 'lib\ferramentas.ps1')

$tools = [ordered]@{
  node = FindNode
  ffmpeg = FindFfmpeg
  ffprobe = FindFfprobe
  python = FindPython
}
$model = ModelState
$remotion = RemotionState $Estudio
$missing = New-Object System.Collections.Generic.List[string]
foreach ($name in $tools.Keys) { if (-not $tools[$name]) { $missing.Add($name) } }
if ($model -eq 'missing') { $missing.Add('speech-model') }
if ($remotion -eq 'missing') { $missing.Add('remotion') }

if ($Json) {
  [ordered]@{ os = 'windows'; missing = [string[]]$missing.ToArray(); tools = $tools; remotion = $remotion } |
    ConvertTo-Json -Compress -Depth 3
} elseif ($missing.Count -gt 0) {
  "Estúdio setup check (nothing was installed): missing $($missing -join ' '). Before editing, the estudio skill asks the Criadora its one preparation question; never install anything without her yes."
}
exit 0

# WHAT  Windows twin of verificar.sh: checks Node, ffmpeg, ffprobe, Python with
#       faster-whisper, the speech model's files and (inside an Estúdio) the Remotion
#       dependencies. Never installs.
# WHY   The session-start hook and the estudio skill must know what is missing before the
#       Diretor asks the one preparation question.
# WHEN  At every session start on Windows (hooks/hooks.json) and whenever the skill needs
#       the paths of the tools.
# HOW   powershell -NoProfile -ExecutionPolicy Bypass -File verificar.ps1 [-Json] [-Dados <folder>] [-Estudio <folder>]
#       Defaults: $env:CLAUDE_PLUGIN_DATA and $env:CLAUDE_PROJECT_DIR (else the current
#       folder). Same output as verificar.sh. Always exits 0.
param(
  [switch]$Json,
  [string]$Dados = $env:CLAUDE_PLUGIN_DATA,
  [string]$Estudio = $(if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path })
)
[Console]::OutputEncoding = [Text.Encoding]::UTF8
if (-not $Dados) { $Dados = Join-Path $env:TEMP 'estudio-sem-dados' }
. (Join-Path $PSScriptRoot 'lib\ferramentas.ps1')

$ferramentas = [ordered]@{
  node = AchaNode
  ffmpeg = AchaFfmpeg
  ffprobe = AchaFfprobe
  python = AchaPython
}
$modelo = EstadoModelo
$remotion = EstadoRemotion $Estudio
$faltando = New-Object System.Collections.Generic.List[string]
foreach ($nome in $ferramentas.Keys) { if (-not $ferramentas[$nome]) { $faltando.Add($nome) } }
if ($modelo -eq 'missing') { $faltando.Add('speech-model') }
if ($remotion -eq 'missing') { $faltando.Add('remotion') }

if ($Json) {
  [ordered]@{ os = 'windows'; missing = [string[]]$faltando.ToArray(); tools = $ferramentas; remotion = $remotion } |
    ConvertTo-Json -Compress -Depth 3
} elseif ($faltando.Count -gt 0) {
  "Estúdio setup check (nothing was installed): missing $($faltando -join ' '). Before editing, the estudio skill asks the Criadora its one preparation question; never install anything without her yes."
}
exit 0

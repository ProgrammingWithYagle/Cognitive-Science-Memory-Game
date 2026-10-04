$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseDirectory = Join-Path $projectRoot 'releases/v0.1.0'
$executable = Join-Path $releaseDirectory 'Mind-Mosaic-0.1.0-Windows-Portable.exe'
if (-not (Test-Path -LiteralPath $executable)) { throw 'Build the portable executable first.' }
$readme = Join-Path $releaseDirectory 'READ_ME.txt'
@'
MIND MOSAIC v0.1.0 - PLAYABLE LOCAL CORE

Extract this ZIP, then double-click Mind-Mosaic-0.1.0-Windows-Portable.exe.
Windows x64. No installation or separate Node.js runtime is required.
The app opens the game and hosts it until you close the window.

Create a room, choose a mode, and share its invitation link or QR code.
Other devices must be on the same Wi-Fi/network. Use the network address
shown in the lobby; localhost opens only on the hosting computer.
Allow Windows network access on your trusted private network if prompted.
Some school/guest networks isolate devices.

Two to eight players can play. Everyone readies up, then the host starts.
For a first look, choose a four-round General Play match with Standard
challenge. One unscored practice round is available for a solo preview.
Manual custom packs and course starters work without internet.

This is the core playtest build. Public hosting, optional voice, AI drafting,
and the larger course library are later milestones. The executable is unsigned.
Feedback about pacing, confusion, and replay interest will guide the polish.

Source, rules, and updates:
https://github.com/ProgrammingWithYagle/Cognitive-Science-Memory-Game
'@ | Set-Content -LiteralPath $readme -Encoding utf8
$archive = Join-Path $releaseDirectory 'Mind-Mosaic-0.1.0-Windows-Portable.zip'
Compress-Archive -LiteralPath @($executable, $readme, (Join-Path $projectRoot 'LICENSE'), (Join-Path $projectRoot 'THIRD_PARTY_NOTICES.md')) -DestinationPath $archive -Force
$checksums = @($executable, $archive) | ForEach-Object { $digest = Get-FileHash -LiteralPath $_ -Algorithm SHA256; $digest.Hash.ToLower() + '  ' + (Split-Path -Leaf $_) }
$checksums | Set-Content -LiteralPath (Join-Path $releaseDirectory 'SHA256SUMS.txt') -Encoding ascii
$checksums
Get-Item -LiteralPath $archive | Select-Object Name,Length

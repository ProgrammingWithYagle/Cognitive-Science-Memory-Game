$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$version = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
$releaseDirectory = Join-Path $projectRoot ('releases/v' + $version)
$executable = Join-Path $releaseDirectory ('Mind-Mosaic-' + $version + '-Windows-Portable.exe')
if (-not (Test-Path -LiteralPath $executable)) { throw 'Build the portable executable first.' }
$readme = Join-Path $releaseDirectory 'READ_ME.txt'
$readmeText = @'
MIND MOSAIC VERSION - COURSES AND RELIABLE PARTY PLAY

Extract this ZIP, then double-click Mind-Mosaic-VERSION-Windows-Portable.exe.
Windows x64. No installation or separate Node.js runtime is required.
The app opens the game and hosts it until you close the window.

Create a room, choose a mode, and share its invitation link or QR code.
Other devices must be on the same Wi-Fi/network. Use the network address
shown in the lobby; localhost opens only on the hosting computer.
Allow Windows network access on your trusted private network if prompted.
Some school/guest networks isolate devices.

Two to eight players can play. Choose Baby, Easy, Normal, Hard or Insane.
For a first look, choose four rounds and General Play. Solo practice is
unscored. Try Focus clash to preview color words or arrow positions.
Question boards let you skip, return and revise before locking answers.

Content Studio includes 121 catalogue entries across nine universities,
103 course starters and General Play. These share introductory topics;
they are not complete syllabi. Add your own TXT, CSV/TSV, PDF or DOCX notes.
Review imported cards before saving, and export your packs as JSON.
Core play, starter packs and manual/glossary authoring work offline.

Optional voice requires a LiveKit service. Optional AI drafting requires
a creator's OpenAI API key and explicit paid-request consent; players never
need a key. Use the Online setup page in the game or ONLINE_SETUP.md here.
No account, public deployment or paid service is activated by this download.

The executable is unsigned. This is a playtest release. Human microphone,
phone, online network and AI quality tests still need your setup.

Source, rules, downloads and updates:
https://github.com/ProgrammingWithYagle/Cognitive-Science-Memory-Game
'@
$readmeText.Replace('VERSION', $version) | Set-Content -LiteralPath $readme -Encoding utf8
$portableGuide = (Get-Content -LiteralPath (Join-Path $projectRoot 'docs/ONLINE_SETUP.md') -Raw).Replace('../.env.example', 'https://github.com/ProgrammingWithYagle/Cognitive-Science-Memory-Game/blob/codex/mind-mosaic/.env.example').Replace('../render.yaml', 'https://github.com/ProgrammingWithYagle/Cognitive-Science-Memory-Game/blob/codex/mind-mosaic/render.yaml')
$portableGuide | Set-Content -LiteralPath (Join-Path $releaseDirectory 'ONLINE_SETUP.md') -Encoding utf8
Copy-Item -LiteralPath (Join-Path $projectRoot 'public/sample-course-notes.txt') -Destination (Join-Path $releaseDirectory 'sample-course-notes.txt') -Force
$archive = Join-Path $releaseDirectory ('Mind-Mosaic-' + $version + '-Windows-Portable.zip')
$contents = @($executable,$readme,(Join-Path $releaseDirectory 'ONLINE_SETUP.md'),(Join-Path $releaseDirectory 'sample-course-notes.txt'),(Join-Path $projectRoot 'LICENSE'),(Join-Path $projectRoot 'THIRD_PARTY_NOTICES.md'))
Compress-Archive -LiteralPath $contents -DestinationPath $archive -Force
$checksums = @($executable, $archive) | ForEach-Object { $digest = Get-FileHash -LiteralPath $_ -Algorithm SHA256; $digest.Hash.ToLower() + '  ' + (Split-Path -Leaf $_) }
$checksums | Set-Content -LiteralPath (Join-Path $releaseDirectory 'SHA256SUMS.txt') -Encoding ascii
$checksums
Get-Item -LiteralPath $archive | Select-Object Name,Length

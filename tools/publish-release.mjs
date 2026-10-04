// Publishes only this repository's reviewed v0.1.0 assets. Credentials remain in memory.
import { execFileSync } from 'node:child_process';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const repository = 'ProgrammingWithYagle/Cognitive-Science-Memory-Game';
const base = `https://api.github.com/repos/${repository}`;
const mode = process.argv[2] ?? 'check';
if (!['check', 'release'].includes(mode)) throw new Error('Use check or release.');
const credentialOutput = execFileSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\npath=ProgrammingWithYagle/Cognitive-Science-Memory-Game.git\n\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const credential = Object.fromEntries(credentialOutput.trim().split(/\r?\n/).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
if (!credential.password) throw new Error('No existing GitHub credential is available.');
const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${credential.password}`, 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'Mind-Mosaic-Release' };
async function api(url, options = {}) {
  const parsed = new URL(url); if (parsed.protocol !== 'https:' || !['api.github.com', 'uploads.github.com'].includes(parsed.hostname)) throw new Error('Unexpected GitHub API destination.');
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers }, redirect: 'error' });
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}): ${(await response.json().catch(() => ({}))).message ?? 'Unknown API error'}`);
  return response.json();
}
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const remote = await api(`${base}/branches/codex%2Fmind-mosaic`);
if (remote.commit.sha !== commit) throw new Error('Push the current commit before publishing.');
if (mode === 'check') { console.log(JSON.stringify({ authenticatedRepository: remote.name, sourceCommitMatches: true, commit })); process.exit(0); }
const notes = await readFile('docs/RELEASE_NOTES_0.1.0.md', 'utf8');
const releases = await api(`${base}/releases?per_page=30`);
let release = releases.find(r => r.tag_name === 'v0.1.0');
if (!release) release = await api(`${base}/releases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tag_name: 'v0.1.0', target_commitish: commit, name: 'Mind Mosaic 0.1.0 — playable local core', body: notes, draft: true, prerelease: true }) });
const names = ['Mind-Mosaic-0.1.0-Windows-Portable.exe', 'Mind-Mosaic-0.1.0-Windows-Portable.zip', 'SHA256SUMS.txt'];
const uploaded = [];
for (const name of names) {
  const filename = path.join('releases/v0.1.0', name), buffer = await readFile(filename), digest = 'sha256:' + createHash('sha256').update(buffer).digest('hex');
  let asset = release.assets.find(a => a.name === name);
  if (asset) { if (asset.size !== (await stat(filename)).size || asset.digest !== digest) throw new Error(`Existing asset ${name} differs; refusing to overwrite it.`); }
  else { const url = new URL(release.upload_url.split('{')[0]); url.searchParams.set('name', name); asset = await api(url.href, { method: 'POST', headers: { 'Content-Type': name.endsWith('.zip') ? 'application/zip' : name.endsWith('.exe') ? 'application/octet-stream' : 'text/plain', 'Content-Length': String(buffer.length) }, body: buffer }); }
  if (asset.digest !== digest || asset.size !== buffer.length || asset.state !== 'uploaded') throw new Error(`GitHub did not confirm the expected bytes for ${name}.`);
  uploaded.push({ name, bytes: asset.size, digest: asset.digest, url: asset.browser_download_url }); console.log(`Verified upload: ${name}`);
}
release = await api(`${base}/releases/${release.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draft: false, prerelease: true, body: notes }) });
const report = { release: release.html_url, commit, assets: uploaded, prerelease: release.prerelease, published: !release.draft };
await writeFile('artifacts/local/publication.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));

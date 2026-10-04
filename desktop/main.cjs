const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
let game, mainWindow;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    const { createGameServer } = require(path.join(app.getAppPath(), 'dist/runtime.cjs'));
    game = await createGameServer({ clientDir: path.join(app.getAppPath(), 'dist/client'), dataDir: path.join(app.getPath('userData'), 'rooms') });
    let port;
    try { port = await game.listen(4173); } catch (e) { if (e.code !== 'EADDRINUSE') throw e; port = await game.listen(0); }
    const origin = `http://localhost:${port}`;
    if (process.argv.includes('--smoke-test')) {
      const health = await fetch(origin + '/api/health').then(r => r.json());
      const html = await fetch(origin).then(r => r.text());
      const outIndex = process.argv.indexOf('--smoke-out'), out = process.argv[outIndex + 1];
      if (outIndex >= 0 && out) await fs.writeFile(out, JSON.stringify({ health, frontend: html.includes('Mind Mosaic'), port, electron: process.versions.electron }, null, 2));
      await game.close(); game = undefined; app.exit(health.ok && html.includes('Mind Mosaic') ? 0 : 1); return;
    }
    mainWindow = new BrowserWindow({ width: 1280, height: 920, minWidth: 360, minHeight: 640, title: 'Mind Mosaic', icon: path.join(__dirname, 'icon.ico'), backgroundColor: '#f6f4ed', webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
    mainWindow.webContents.on('will-navigate', (event, url) => { try { if (new URL(url).origin !== origin) event.preventDefault(); } catch { event.preventDefault(); } });
    mainWindow.webContents.setWindowOpenHandler(({ url }) => { try { if (new URL(url).origin === origin) return { action: 'allow', overrideBrowserWindowOptions: { webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } } }; if (new URL(url).protocol === 'https:') void shell.openExternal(url); } catch {} return { action: 'deny' }; });
    await mainWindow.loadURL(origin);
  }).catch(e => { dialog.showErrorBox('Mind Mosaic could not start', e.message); app.exit(1); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { if (game) void game.close(); });
}

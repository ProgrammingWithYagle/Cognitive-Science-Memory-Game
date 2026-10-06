const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
let game,
  mainWindow,
  closing = false;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      Menu.setApplicationMenu(null);
      const { createGameServer, readVoiceConfig } = require(
        path.join(app.getAppPath(), "dist/runtime.cjs"),
      );
      game = await createGameServer({
        clientDir: path.join(app.getAppPath(), "dist/client"),
        dataDir: path.join(app.getPath("userData"), "rooms"),
        voice: readVoiceConfig(process.env),
      });
      let port;
      try {
        port = await game.listen(4173);
      } catch (e) {
        if (e.code !== "EADDRINUSE") throw e;
        port = await game.listen(0);
      }
      const origin = `http://localhost:${port}`;
      if (process.argv.includes("--smoke-test")) {
        const health = await fetch(origin + "/api/health").then((r) =>
          r.json(),
        );
        const html = await fetch(origin).then((r) => r.text());
        const outIndex = process.argv.indexOf("--smoke-out"),
          out = process.argv[outIndex + 1];
        if (outIndex >= 0 && out)
          await fs.writeFile(
            out,
            JSON.stringify(
              {
                health,
                frontend: html.includes("Mind Mosaic"),
                port,
                electron: process.versions.electron,
              },
              null,
              2,
            ),
          );
        await game.close();
        game = undefined;
        app.exit(health.ok && html.includes("Mind Mosaic") ? 0 : 1);
        return;
      }
      mainWindow = new BrowserWindow({
        width: 1280,
        height: 920,
        minWidth: 360,
        minHeight: 640,
        title: "Mind Mosaic",
        icon: path.join(__dirname, "icon.ico"),
        backgroundColor: "#f6f4ed",
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      let microphoneApproved = false;
      const ownOrigin = (value) => {
        try {
          return new URL(value).origin === origin;
        } catch {
          return false;
        }
      };
      mainWindow.webContents.session.setPermissionCheckHandler(
        (contents, permission, requestingOrigin, details) =>
          !!contents &&
          ownOrigin(requestingOrigin) &&
          details.isMainFrame &&
          (permission === "clipboard-sanitized-write" ||
            (permission === "media" &&
              details.mediaType === "audio" &&
              microphoneApproved)),
      );
      mainWindow.webContents.session.setPermissionRequestHandler(
        async (contents, permission, callback, details) => {
          if (
            permission === "clipboard-sanitized-write" &&
            contents &&
            ownOrigin(contents.getURL())
          ) {
            callback(true);
            return;
          }
          if (
            permission !== "media" ||
            !contents ||
            !ownOrigin(contents.getURL()) ||
            !ownOrigin(details.securityOrigin ?? details.requestingUrl ?? "") ||
            !details.mediaTypes?.length ||
            details.mediaTypes.some((type) => type !== "audio")
          ) {
            callback(false);
            return;
          }
          const result = await dialog.showMessageBox(mainWindow, {
            type: "question",
            title: "Room microphone",
            message: "Allow your microphone for room voice?",
            detail:
              "Use Hold to talk or the microphone toggle. Private recall automatically mutes voice.",
            buttons: ["Allow microphone", "Keep listening"],
            defaultId: 1,
            cancelId: 1,
          });
          microphoneApproved = result.response === 0;
          callback(microphoneApproved);
        },
      );
      mainWindow.webContents.on("will-navigate", (event, url) => {
        try {
          if (new URL(url).origin !== origin) event.preventDefault();
        } catch {
          event.preventDefault();
        }
      });
      mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        try {
          if (new URL(url).origin === origin)
            return {
              action: "allow",
              overrideBrowserWindowOptions: {
                webPreferences: {
                  contextIsolation: true,
                  nodeIntegration: false,
                  sandbox: true,
                },
              },
            };
          if (new URL(url).protocol === "https:") void shell.openExternal(url);
        } catch {}
        return { action: "deny" };
      });
      await mainWindow.loadURL(origin);
    })
    .catch((e) => {
      dialog.showErrorBox("Mind Mosaic could not start", e.message);
      app.exit(1);
    });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", (event) => {
    if (game && !closing) {
      event.preventDefault();
      closing = true;
      void game.close().finally(() => {
        game = undefined;
        app.quit();
      });
    }
  });
}

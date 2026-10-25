const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const { fileURLToPath } = require("node:url");

const entryPath = path.resolve(__dirname, "renderer", "index.html");

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    backgroundColor: "#080d10",
    title: "ЛОРГУС",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    // Never let a renderer-created window gain local or privileged access.
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    let destination;
    try {
      if (!url.startsWith("file://")) {
        event.preventDefault();
        return;
      }
      destination = path.resolve(fileURLToPath(url));
    } catch {
      event.preventDefault();
      return;
    }
    if (destination !== entryPath) event.preventDefault();
  });

  win.once("ready-to-show", () => win.show());
  void win.loadFile(entryPath);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

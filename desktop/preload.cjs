const { contextBridge } = require("electron");

// Intentionally expose no Node.js APIs or privileged IPC to the renderer.
contextBridge.exposeInMainWorld("lorgusDesktop", Object.freeze({
  version: "0.1.0-prototype",
  platform: "windows-desktop"
}));

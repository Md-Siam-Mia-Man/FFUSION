const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Main -> Renderer
  onJobFeedback: (callback) =>
    ipcRenderer.on("job-feedback", (event, ...args) => callback(...args)),

  // Renderer -> Main
  setTitleBarTheme: (theme) => ipcRenderer.send("set-title-bar-theme", theme),
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  saveFile: (options) => ipcRenderer.invoke("dialog:saveFile", options),
  getMediaInfo: (filePath) => ipcRenderer.invoke("get-media-info", filePath),
  runJob: (job) => ipcRenderer.send("run-job", job),
  generatePreview: (filePath) =>
    ipcRenderer.invoke("generate-preview", filePath),
  openPath: (path) => ipcRenderer.send("shell:openPath", path),
});

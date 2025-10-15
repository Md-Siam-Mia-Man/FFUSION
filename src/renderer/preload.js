const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  onJobFeedback: (callback) =>
    ipcRenderer.on("job-feedback", (event, ...args) => callback(...args)),

  setTitleBarTheme: (theme) => ipcRenderer.send("set-title-bar-theme", theme),
  openFile: (options) => ipcRenderer.invoke("dialog:openFile", options),
  openDirectory: () => ipcRenderer.invoke("dialog:openDirectory"),
  saveFile: (options) => ipcRenderer.invoke("dialog:saveFile", options),
  getMediaInfo: (filePath) => ipcRenderer.invoke("get-media-info", filePath),
  runJob: (job) => ipcRenderer.send("run-job", job),
  runStitchJob: (job) => ipcRenderer.send("run-stitch-job", job),
  runGifJob: (job) => ipcRenderer.send("run-gif-job", job),
  generatePreview: (filePath) =>
    ipcRenderer.invoke("generate-preview", filePath),
  openPath: (path) => ipcRenderer.send("shell:openPath", path),
  showItemInFolder: (path) => ipcRenderer.send("shell:showItemInFolder", path),
});

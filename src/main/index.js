const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let mainWindow;

const isDev = !app.isPackaged;
const binariesPath = isDev
  ? path.join(__dirname, "..", "..", "binaries")
  : path.join(process.resourcesPath, "binaries");

const ffmpegPath = path.join(
  binariesPath,
  process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
);
const ffprobePath = path.join(
  binariesPath,
  process.platform === "win32" ? "ffprobe.exe" : "ffprobe"
);

const tempDir = path.join(app.getPath("userData"), "thumbnails");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

function buildCommandArgs(jobType, options) {
  const { inputFile, outputFile } = options;
  let args = ["-i", inputFile];

  switch (jobType) {
    case "CONVERT":
      const { video, audio, output } = options.settings;
      if (video.codec === "copy") {
        args.push("-c:v", "copy");
      } else {
        args.push("-c:v", video.codec);
        if (video.crf) args.push("-crf", video.crf);
        if (video.bitrate) args.push("-b:v", `${video.bitrate}k`);
        if (video.resolution) args.push("-vf", `scale=${video.resolution}`);
        if (video.framerate) args.push("-r", video.framerate);
        if (video.pix_fmt) args.push("-pix_fmt", video.pix_fmt);
        if (video.gop) args.push("-g", video.gop);
      }
      if (audio.action === "copy") {
        args.push("-c:a", "copy");
      } else if (audio.action === "convert") {
        args.push("-c:a", audio.codec);
        if (audio.bitrate) args.push("-b:a", `${audio.bitrate}k`);
        if (audio.samplerate) args.push("-ar", audio.samplerate);
      } else if (audio.action === "remove") {
        args.push("-an");
      }
      if (output.timeLimit) args.push("-t", output.timeLimit);
      if (output.bufferSize) args.push("-bufsize", `${output.bufferSize}k`);
      args.push("-y", outputFile);
      break;

    case "TRIM":
      const { trim } = options.settings;
      if (trim.start) args.push("-ss", trim.start);
      if (trim.end) args.push("-to", trim.end);
      args.push("-c", "copy");
      args.push("-y", outputFile);
      break;

    case "EXTRACT_AUDIO":
      args.push("-vn", "-c:a", "copy", "-y", outputFile);
      break;

    case "EXTRACT_FRAMES":
      const { fps, format } = options.settings;
      args.push("-vf", `fps=${fps}`);
      if (format === "jpg") {
        args.push("-q:v", "2"); // Add quality setting for JPG
      }
      const outputPattern = path.join(outputFile, `frame-%05d.${format}`);
      args.push(outputPattern);
      break;
  }

  return args;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1100,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "..", "renderer", "preload.js"),
    },
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#ffffff",
      symbolColor: "#2d3748",
      height: 40,
    },
    backgroundColor: "#ffffff",
  });
  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  // if (isDev) mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
app.on(
  "activate",
  () => BrowserWindow.getAllWindows().length === 0 && createWindow()
);

ipcMain.on("set-title-bar-theme", (event, theme) => {
  mainWindow.setTitleBarOverlay(
    theme === "dark"
      ? { color: "#1a202c", symbolColor: "#e2e8f0" }
      : { color: "#ffffff", symbolColor: "#2d3748" }
  );
});

ipcMain.handle(
  "dialog:openFile",
  async () =>
    (await dialog.showOpenDialog(mainWindow, { properties: ["openFile"] }))
      .filePaths[0] || null
);
ipcMain.handle(
  "dialog:openDirectory",
  async () =>
    (await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory"] }))
      .filePaths[0] || null
);
ipcMain.handle(
  "dialog:saveFile",
  async (event, options) =>
    (await dialog.showSaveDialog(mainWindow, options)).filePath || null
);
ipcMain.on("shell:openPath", (event, path) => shell.openPath(path));

ipcMain.handle(
  "get-media-info",
  (event, filePath) =>
    new Promise((resolve, reject) => {
      const ffprobe = spawn(ffprobePath, [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        filePath,
      ]);
      let data = "";
      ffprobe.stdout.on("data", (chunk) => (data += chunk));
      ffprobe.on("close", (code) =>
        code === 0
          ? resolve(JSON.parse(data))
          : reject(`ffprobe exited with code ${code}`)
      );
      ffprobe.on("error", reject);
    })
);

ipcMain.on("run-job", (event, { jobId, jobType, options }) => {
  const args = buildCommandArgs(jobType, options);
  console.log(`Spawning FFmpeg [${jobType}]: ${ffmpegPath} ${args.join(" ")}`);
  const ffmpeg = spawn(ffmpegPath, args);

  mainWindow.webContents.send("job-feedback", [
    { jobId, type: "start", message: `Process started.` },
  ]);

  ffmpeg.stderr.on("data", (data) => {
    const line = data.toString();
    let feedback = { jobId, type: "log", message: line };

    if (jobType === "EXTRACT_FRAMES") {
      const frameMatch = line.match(/frame=\s*(\d+)/);
      if (frameMatch) {
        feedback.frame = parseInt(frameMatch[1], 10);
        feedback.totalFrames = options.totalFrames;
      }
    } else {
      const progressMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      const duration = parseFloat(options.sourceInfo.format.duration) || 0;
      if (progressMatch && duration > 0) {
        const [, h, m, s, ms] = progressMatch.map(Number);
        const currentTime = h * 3600 + m * 60 + s + ms / 100;
        const effectiveDuration = options.settings?.output?.timeLimit
          ? new Date(
              `1970-01-01T${options.settings.output.timeLimit}Z`
            ).getTime() / 1000
          : duration;
        feedback.progress = Math.min(
          100,
          (currentTime / effectiveDuration) * 100
        );
      }
    }
    mainWindow.webContents.send("job-feedback", [feedback]);
  });

  ffmpeg.on("close", (code) => {
    const status = code === 0 ? "success" : "error";
    const message = `Process finished with code ${code}.`;
    mainWindow.webContents.send("job-feedback", [
      { jobId, type: status, message, totalFrames: options.totalFrames },
    ]);
  });
  ffmpeg.on("error", (err) =>
    mainWindow.webContents.send("job-feedback", [
      { jobId, type: "error", message: `Process error: ${err.message}` },
    ])
  );
});

ipcMain.handle("generate-preview", (event, filePath) => {
  return new Promise((resolve, reject) => {
    const thumbnailPath = path.join(tempDir, `thumb-${Date.now()}.jpg`);
    const args = [
      "-i",
      filePath,
      "-ss",
      "00:00:01.000",
      "-vframes",
      "1",
      "-vf",
      "scale=320:-1",
      "-q:v",
      "3",
      thumbnailPath,
    ];
    const ffmpeg = spawn(ffmpegPath, args);
    ffmpeg.on("close", (code) =>
      code === 0
        ? resolve(thumbnailPath)
        : reject("Failed to generate thumbnail.")
    );
    ffmpeg.on("error", (err) => reject(err));
  });
});

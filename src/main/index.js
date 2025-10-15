const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs/promises");
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

const tempDir = path.join(app.getPath("userData"), "temp");

async function initialize() {
  await fs.mkdir(tempDir, { recursive: true });
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
        args.push("-c:v", video.codec, "-crf", video.crf);
        if (video.bitrate) args.push("-b:v", `${video.bitrate}k`);
        if (video.resolution) args.push("-vf", `scale=${video.resolution}`);
        if (video.framerate) args.push("-r", video.framerate);
      }
      if (audio.action === "copy") {
        args.push("-c:a", "copy");
      } else if (audio.action === "convert") {
        args.push("-c:a", audio.codec);
        if (audio.bitrate) args.push("-b:a", `${audio.bitrate}k`);
      } else if (audio.action === "remove") {
        args.push("-an");
      }
      if (output.timeLimit) args.push("-t", output.timeLimit);
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
      if (format === "jpg") args.push("-q:v", "2");
      const outputPattern = path.join(outputFile, `frame-%05d.${format}`);
      args.push(outputPattern);
      break;
  }
  return args;
}

function runFFmpeg(jobId, args, onProgress) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, args);
    mainWindow.webContents.send("job-feedback", [
      { jobId, type: "start", message: "Process started." },
    ]);

    ffmpeg.stderr.on("data", (data) => {
      const line = data.toString();
      const feedback = onProgress(line);
      mainWindow.webContents.send("job-feedback", [
        { jobId, type: "log", message: line, ...feedback },
      ]);
    });

    ffmpeg.on("close", (code) => {
      const status = code === 0 ? "success" : "error";
      const message = `Process finished with code ${code}.`;
      mainWindow.webContents.send("job-feedback", [
        { jobId, type: status, message },
      ]);
      code === 0 ? resolve() : reject(new Error(message));
    });

    ffmpeg.on("error", (err) => {
      mainWindow.webContents.send("job-feedback", [
        { jobId, type: "error", message: `Process error: ${err.message}` },
      ]);
      reject(err);
    });
  });
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
    titleBarOverlay: { color: "#ffffff", symbolColor: "#2d3748", height: 40 },
    backgroundColor: "#ffffff",
    icon: path.join(__dirname, "..", "..", "assets", "icon.png"),
  });
  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  await initialize();
  createWindow();
});
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
  async (event, options) =>
    (await dialog.showOpenDialog(mainWindow, options)).filePaths
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
ipcMain.on("shell:showItemInFolder", (event, path) =>
  shell.showItemInFolder(path)
);

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
  const duration = parseFloat(options.sourceInfo.format.duration) || 0;
  runFFmpeg(jobId, args, (line) => {
    if (jobType === "EXTRACT_FRAMES") {
      const frameMatch = line.match(/frame=\s*(\d+)/);
      if (frameMatch)
        return {
          frame: parseInt(frameMatch[1], 10),
          totalFrames: options.totalFrames,
        };
    } else {
      const progressMatch = line.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (progressMatch && duration > 0) {
        const [, h, m, s, ms] = progressMatch.map(Number);
        const currentTime = h * 3600 + m * 60 + s + ms / 100;
        return { progress: Math.min(100, (currentTime / duration) * 100) };
      }
    }
    return {};
  }).catch(console.error);
});

ipcMain.on("run-stitch-job", async (event, { jobId, files, outputFile }) => {
  const listPath = path.join(tempDir, `stitch-list-${jobId}.txt`);
  const fileContent = files
    .map((f) => `file '${f.replace(/'/g, "'\\''")}'`)
    .join("\n");
  await fs.writeFile(listPath, fileContent);

  const args = [
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    "-y",
    outputFile,
  ];

  try {
    await runFFmpeg(jobId, args, (line) => ({}));
    mainWindow.webContents.send("job-feedback", [
      { jobId, type: "success", outputFile },
    ]);
  } catch (e) {
    console.error(e);
  } finally {
    await fs.unlink(listPath);
  }
});

ipcMain.on("run-gif-job", async (event, { jobId, options }) => {
  const { inputFile, outputFile, settings } = options;
  const { start, end, fps, width } = settings;
  const palettePath = path.join(tempDir, `palette-${jobId}.png`);

  const paletteArgs = [
    "-i",
    inputFile,
    "-ss",
    start,
    "-to",
    end,
    "-vf",
    `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
    "-y",
    palettePath,
  ];
  const gifArgs = [
    "-i",
    inputFile,
    "-ss",
    start,
    "-to",
    end,
    "-i",
    palettePath,
    "-lavfi",
    `fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
    "-y",
    outputFile,
  ];

  try {
    await runFFmpeg(jobId, paletteArgs, () => ({
      progress: 25,
      statusText: "Generating palette...",
    }));
    await runFFmpeg(jobId, gifArgs, () => ({
      progress: 75,
      statusText: "Creating GIF...",
    }));
    mainWindow.webContents.send("job-feedback", [
      { jobId, type: "success", outputFile },
    ]);
  } catch (e) {
    console.error(e);
  } finally {
    await fs.unlink(palettePath);
  }
});

ipcMain.handle(
  "generate-preview",
  (event, filePath) =>
    new Promise((resolve, reject) => {
      const thumbnailPath = path.join(tempDir, `thumb-${Date.now()}.jpg`);
      const args = [
        "-i",
        filePath,
        "-ss",
        "00:00:01.000",
        "-vframes",
        "1",
        "-vf",
        "scale=640:-1",
        "-q:v",
        "3",
        "-y",
        thumbnailPath,
      ];
      const ffmpeg = spawn(ffmpegPath, args);
      ffmpeg.on("close", (code) =>
        code === 0
          ? resolve(thumbnailPath)
          : reject("Failed to generate thumbnail.")
      );
      ffmpeg.on("error", (err) => reject(err));
    })
);

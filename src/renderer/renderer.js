document.addEventListener("DOMContentLoaded", () => {
  let currentFile = null;
  let stitchFiles = [];
  let extractionJobs = {};
  let currentImageViewer = { paths: [], index: 0 };

  const dom = {
    navItems: document.querySelectorAll(".nav-item"),
    pages: document.querySelectorAll(".page"),
    themeToggleBtn: document.getElementById("theme-toggle-btn"),
    statusText: document.getElementById("status-text"),
    statusBarProgress: document.getElementById("status-progress-bar"),
    clearFileBtn: document.getElementById("clear-file-btn"),

    dashboardHeaderControls: document.getElementById(
      "dashboard-header-controls"
    ),
    dashboardWelcome: document.getElementById("dashboard-welcome"),
    dashboardContent: document.getElementById("dashboard-content"),
    dashboardPreviewContainer: document.getElementById(
      "dashboard-preview-container"
    ),
    dashboardActionsContainer: document.getElementById(
      "dashboard-actions-container"
    ),
    dashboardInspector: document.getElementById("dashboard-inspector"),

    stitchAddVideosBtn: document.getElementById("stitch-add-videos-btn"),
    stitchFileList: document.getElementById("stitch-file-list"),
    stitchStartBtn: document.getElementById("stitch-start-btn"),
    stitchClearBtn: document.getElementById("stitch-clear-btn"),

    convertSourceFile: document.getElementById("convert-source-file"),
    addToQueueBtn: document.getElementById("add-to-queue-btn"),
    jobQueueList: document.getElementById("job-queue-list"),
    videoResolutionInput: document.getElementById("video-resolution"),
    videoFramerateInput: document.getElementById("video-framerate"),

    extractSourceFile: document.getElementById("extract-source-file"),
    extractFramesBtn: document.getElementById("extract-frames-btn"),
    extractFpsInput: document.getElementById("extract-fps"),
    extractFormatGroup: document.getElementById("extract-format"),
    extractInfoCard: document.getElementById("extract-info-card"),
    extractInfoDuration: document.getElementById("extract-info-duration"),
    extractInfoFps: document.getElementById("extract-info-fps"),
    extractInfoTotal: document.getElementById("extract-info-total"),
    extractOutputDirInput: document.getElementById("extract-output-dir"),
    extractSelectDirBtn: document.getElementById("extract-select-dir-btn"),
    extractOpenDirBtn: document.getElementById("extract-open-dir-btn"),
    extractResultsContainer: document.getElementById(
      "extract-results-container"
    ),
    extractPreviewGallery: document.getElementById("extract-preview-gallery"),

    trimSourceFile: document.getElementById("trim-source-file"),
    trimStartBtn: document.getElementById("trim-start-btn"),
    createGifBtn: document.getElementById("create-gif-btn"),
    gifWidthInput: document.getElementById("gif-width"),
    gifFpsInput: document.getElementById("gif-fps"),
    trimVideoPlayer: document.getElementById("trim-video-player"),
    trimPlayBtn: document.getElementById("trim-play-btn"),
    trimCurrentTime: document.getElementById("trim-current-time"),
    trimDuration: document.getElementById("trim-duration"),
    trimTimelineContainer: document.querySelector(".timeline-container"),
    trimTimelineSelection: document.querySelector(".timeline-track-selection"),
    trimPlayhead: document.querySelector(".timeline-playhead"),
    trimHandleStart: document.getElementById("trim-handle-start"),
    trimHandleEnd: document.getElementById("trim-handle-end"),
    trimStartTimeInput: document.getElementById("trim-start-time"),
    trimEndTimeInput: document.getElementById("trim-end-time"),

    audioSourceFile: document.getElementById("audio-source-file"),
    extractAudioBtn: document.getElementById("extract-audio-btn"),

    imageViewer: document.getElementById("image-viewer"),
    viewerImage: document.getElementById("viewer-image"),
    viewerClose: document.getElementById("viewer-close"),
    viewerPrev: document.getElementById("viewer-prev"),
    viewerNext: document.getElementById("viewer-next"),
  };

  setupEventListeners();

  function clearFile() {
    currentFile = null;
    dom.dashboardWelcome.classList.remove("hidden");
    dom.dashboardContent.classList.add("hidden");
    dom.dashboardHeaderControls.classList.add("hidden");

    stitchFiles = [];
    renderStitchList();

    document
      .querySelectorAll("span[id$='-source-file']")
      .forEach((span) => (span.textContent = "None"));
    document
      .querySelectorAll("button[id$='-btn']")
      .forEach((btn) => (btn.disabled = true));

    dom.clearFileBtn.disabled = false;
    dom.stitchAddVideosBtn.disabled = false;
    dom.themeToggleBtn.disabled = false;

    dom.trimVideoPlayer.src = "";
    dom.trimStartTimeInput.value = "00:00:00.000";
    dom.trimEndTimeInput.value = "00:00:00.000";

    dom.extractInfoCard.classList.add("hidden");
    dom.extractResultsContainer.classList.add("hidden");
    dom.extractOutputDirInput.value = "";

    updateStatus("Ready", "ready");
  }

  function setupEventListeners() {
    dom.themeToggleBtn.addEventListener("click", toggleTheme);
    dom.navItems.forEach((item) =>
      item.addEventListener("click", () => navigateTo(item.dataset.page))
    );
    dom.clearFileBtn.addEventListener("click", clearFile);

    document
      .querySelectorAll(".button[id^='browse-file-']")
      .forEach((btn) =>
        btn.addEventListener("click", () => handleBrowseFile({}))
      );
    document
      .querySelector("#dashboard-welcome .button")
      .addEventListener("click", () => handleBrowseFile({}));

    const appBody = document.body;
    appBody.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.dashboardWelcome
        .querySelector(".drop-zone")
        .classList.add("drag-over");
    });
    appBody.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.dashboardWelcome
        .querySelector(".drop-zone")
        .classList.remove("drag-over");
    });
    appBody.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.dashboardWelcome
        .querySelector(".drop-zone")
        .classList.remove("drag-over");
      if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0].path);
    });

    dom.dashboardActionsContainer.addEventListener("click", (e) => {
      const card = e.target.closest(".action-card");
      if (card) navigateTo(card.dataset.page);
    });
    dom.dashboardInspector.addEventListener("click", handleInspectorCopy);

    dom.stitchAddVideosBtn.addEventListener("click", handleStitchAdd);
    dom.stitchClearBtn.addEventListener("click", () => {
      stitchFiles = [];
      renderStitchList();
    });
    dom.stitchFileList.addEventListener("click", handleStitchRemove);
    dom.stitchStartBtn.addEventListener("click", runStitchJob);
    setupDragAndDrop(dom.stitchFileList, stitchFiles, renderStitchList);

    dom.addToQueueBtn.addEventListener("click", addConversionJobToQueue);
    dom.trimStartBtn.addEventListener("click", runTrimJob);
    dom.createGifBtn.addEventListener("click", runGifJob);
    dom.extractAudioBtn.addEventListener("click", runExtractAudioJob);

    dom.extractSelectDirBtn.addEventListener("click", handleSelectExtractDir);
    dom.extractOpenDirBtn.addEventListener("click", () =>
      window.api.openPath(dom.extractOutputDirInput.value)
    );
    dom.extractFpsInput.addEventListener("input", updateEstimatedFrames);
    document.querySelectorAll("#page-extract .preset-button").forEach((btn) => {
      btn.addEventListener("click", () => {
        dom.extractFpsInput.value = btn.dataset.value;
        updateEstimatedFrames();
      });
    });
    dom.extractFramesBtn.addEventListener("click", runExtractFramesJob);
    dom.extractPreviewGallery.addEventListener("click", (e) => {
      const thumb = e.target.closest(".preview-thumbnail");
      if (thumb) {
        const index = parseInt(thumb.dataset.index, 10);
        openImageViewer(extractionJobs[thumb.dataset.jobId].imagePaths, index);
      }
    });

    document.body.addEventListener("click", (e) => {
      const button = e.target.closest(".show-file-btn");
      if (button) window.api.showItemInFolder(button.dataset.path);
    });

    window.api.onJobFeedback(([feedback]) => handleJobFeedback(feedback));

    setupCustomComponentHandlers(document.body);
    setupSlider(document.getElementById("video-crf-slider"));
    setupTrimPage();
    setupImageViewer();
    updateConvertFormState();
  }

  async function handleBrowseFile({ multiple = false }) {
    const filePaths = await window.api.openFile({
      properties: multiple ? ["openFile", "multiSelections"] : ["openFile"],
    });
    if (filePaths && filePaths.length > 0) loadFile(filePaths[0]);
    return filePaths;
  }

  function setupCustomComponentHandlers(container) {
    container.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("button-group-item")) {
        const group = target.parentElement;
        [...group.children].forEach((child) =>
          child.classList.remove("active")
        );
        target.classList.add("active");
        group.dataset.value = target.dataset.value;
        if (group.id === "video-codec" || group.id === "audio-action") {
          updateConvertFormState();
        }
        if (group.id === "extract-format") {
          dom.extractFramesBtn.disabled = !dom.extractOutputDirInput.value;
        }
      }
    });
  }

  function setupSlider(slider) {
    let isDragging = false;
    const moveHandler = (e) => {
      if (!isDragging) return;
      const rect = slider
        .querySelector(".slider-track")
        .getBoundingClientRect();
      const percent = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      );
      const value = Math.round(
        parseFloat(slider.dataset.min) +
          percent *
            (parseFloat(slider.dataset.max) - parseFloat(slider.dataset.min))
      );
      updateSlider(slider, value);
    };
    const upHandler = () => {
      isDragging = false;
      window.removeEventListener("mousemove", moveHandler);
      window.removeEventListener("mouseup", upHandler);
    };
    slider.addEventListener("mousedown", (e) => {
      e.preventDefault();
      isDragging = true;
      moveHandler(e);
      window.addEventListener("mousemove", moveHandler);
      window.addEventListener("mouseup", upHandler);
    });
  }

  function updateSlider(slider, value) {
    const min = parseFloat(slider.dataset.min),
      max = parseFloat(slider.dataset.max);
    const clampedValue = Math.max(min, Math.min(max, value));
    slider.dataset.value = clampedValue;
    slider.querySelector(".slider-value").textContent = clampedValue;
    const percent = (clampedValue - min) / (max - min);
    slider.querySelector(".slider-progress").style.width = `${percent * 100}%`;
    slider.querySelector(".slider-thumb").style.left = `${percent * 100}%`;
  }

  function updateConvertFormState() {
    const isVideoCopy =
      document.getElementById("video-codec").dataset.value === "copy";
    document
      .querySelectorAll("#page-convert .video-options")
      .forEach((el) => el.classList.toggle("disabled", isVideoCopy));
    const showAudioOptions =
      document.getElementById("audio-action").dataset.value === "convert";
    document
      .querySelectorAll("#page-convert .audio-options")
      .forEach((el) => el.classList.toggle("disabled", !showAudioOptions));
  }

  async function loadFile(filePath) {
    try {
      updateStatus(`Probing file...`, "processing");
      const mediaInfo = await window.api.getMediaInfo(filePath);
      currentFile = { path: filePath, info: mediaInfo };
      updateStatus(`Loaded: ${filePath.split(/[\\/]/).pop()}`, "ready");
      updateAllPagesWithNewFile();
    } catch (error) {
      currentFile = null;
      updateStatus(`Error loading file: ${error}`, "error");
    }
  }

  async function updateAllPagesWithNewFile() {
    if (!currentFile) return;
    const { path, info } = currentFile;
    const fileName = path.split(/[\\/]/).pop();
    const videoStream = info.streams.find((s) => s.codec_type === "video");
    const audioStream = info.streams.find((s) => s.codec_type === "audio");

    dom.dashboardWelcome.classList.add("hidden");
    dom.dashboardContent.classList.remove("hidden");
    dom.dashboardHeaderControls.classList.remove("hidden");

    if (videoStream) {
      const thumbPath = await window.api.generatePreview(path);
      dom.dashboardPreviewContainer.innerHTML = `<img src="file://${thumbPath.replace(
        /\\/g,
        "/"
      )}" class="preview-image" alt="Thumbnail"><div class="preview-details"><h2 title="${path}">${fileName}</h2><p>${
        videoStream.width
      }x${videoStream.height} &nbsp;&bull;&nbsp; ${format.duration(
        info.format.duration
      )}</p></div>`;
    } else {
      dom.dashboardPreviewContainer.innerHTML = `<i class="fa-solid fa-music preview-audio-icon"></i><div class="preview-details"><h2 title="${path}">${fileName}</h2><p>${
        audioStream.codec_long_name
      } &nbsp;&bull;&nbsp; ${format.duration(info.format.duration)}</p></div>`;
    }

    dom.dashboardActionsContainer.innerHTML = `<div class="action-card" data-page="page-convert"><h3><i class="fa-solid fa-gear"></i> Convert & Process</h3><p>Change format, codec, resolution, and more.</p></div><div class="action-card" data-page="page-trim"><h3><i class="fa-solid fa-scissors"></i> Trim & GIF</h3><p>Visually trim or create animated GIFs.</p></div>`;
    renderInspectorUI(info);

    document
      .querySelectorAll("span[id$='-source-file']")
      .forEach((span) => (span.textContent = path));

    dom.addToQueueBtn.disabled = false;
    dom.extractSelectDirBtn.disabled = !videoStream;
    dom.trimStartBtn.disabled = !videoStream;
    dom.createGifBtn.disabled = !videoStream;
    dom.extractAudioBtn.disabled = !audioStream;

    if (videoStream) {
      dom.extractInfoCard.classList.remove("hidden");
      dom.extractInfoDuration.textContent = format.duration(
        info.format.duration
      );
      dom.extractInfoFps.textContent = format.frameRate(
        videoStream.r_frame_rate
      );
      updateEstimatedFrames();
    }

    dom.trimVideoPlayer.src = `file://${path.replace(/\\/g, "/")}`;
  }

  function renderInspectorUI(mediaInfo) {
    const { format: fileFormat, streams } = mediaInfo;
    let cardsHtml = "";

    const fileCardBody = [
      createProperty("Container", fileFormat.format_long_name),
      createProperty("Size", format.bytes(fileFormat.size)),
      createProperty("Duration", format.duration(fileFormat.duration)),
      createProperty("Bitrate", format.bitrate(fileFormat.bit_rate)),
      createProperty("Streams", fileFormat.nb_streams),
    ].join("");
    cardsHtml += createCard("File", "fa-file-lines", fileFormat, fileCardBody);

    streams.forEach((stream) => {
      let title, icon, body;
      if (stream.codec_type === "video") {
        title = `Video Stream #${stream.index}`;
        icon = "fa-film";
        body = [
          createProperty(
            "Codec",
            `${stream.codec_long_name} (${stream.codec_name})`,
            true
          ),
          createProperty("Profile", stream.profile),
          createProperty("Resolution", `${stream.width} x ${stream.height}`),
          createProperty("Aspect Ratio", stream.display_aspect_ratio),
          createProperty("Pixel Format", stream.pix_fmt, true),
          createProperty("Frame Rate", format.frameRate(stream.r_frame_rate)),
          createProperty("Bitrate", format.bitrate(stream.bit_rate)),
        ].join("");
      } else if (stream.codec_type === "audio") {
        title = `Audio Stream #${stream.index}`;
        icon = "fa-waveform";
        body = [
          createProperty(
            "Codec",
            `${stream.codec_long_name} (${stream.codec_name})`,
            true
          ),
          createProperty("Profile", stream.profile),
          createProperty("Sample Rate", format.sampleRate(stream.sample_rate)),
          createProperty(
            "Channels",
            `${stream.channels} (${stream.channel_layout})`
          ),
          createProperty("Bitrate", format.bitrate(stream.bit_rate)),
        ].join("");
      } else {
        return;
      }
      cardsHtml += createCard(title, icon, stream, body);
    });
    dom.dashboardInspector.innerHTML = cardsHtml;
  }

  function createCard(title, icon, rawData, body) {
    return `<div class="info-card"><div class="card-header"><h3><i class="fa-solid ${icon}"></i> ${title}</h3><button class="button copy-json-btn" data-raw='${JSON.stringify(
      rawData
    )}'><i class="fa-solid fa-paste"></i></button></div><div class="card-body">${body}</div></div>`;
  }
  function createProperty(key, value, isBadge = false) {
    if (!value || value === "N/A") return "";
    return `<div class="property-key">${key}</div><div class="property-value ${
      isBadge ? "badge" : ""
    }" title="${value}">${value}</div>`;
  }

  const format = {
    bytes: (b) => {
      if (!b) return "0 Bytes";
      const i = Math.floor(Math.log(b) / Math.log(1024));
      return `${parseFloat((b / Math.pow(1024, i)).toFixed(2))} ${
        ["B", "KB", "MB", "GB"][i]
      }`;
    },
    duration: (s, ms = false) => {
      if (!s) return ms ? "00:00:00.000" : "00:00:00";
      const d = new Date(s * 1000);
      return ms
        ? d.toISOString().substr(11, 12)
        : d.toISOString().substr(11, 8);
    },
    bitrate: (b) => (b ? `${(b / 1000).toFixed(0)} kb/s` : "N/A"),
    frameRate: (fr) => {
      if (!fr || fr === "0/0") return "N/A";
      const [n, d] = fr.split("/");
      return d == 1 ? `${n} fps` : `${(n / d).toFixed(2)} fps`;
    },
    sampleRate: (sr) => (sr ? `${(sr / 1000).toFixed(1)} kHz` : "N/A"),
    titleCase: (str) =>
      str
        .replace(/_/g, " ")
        .replace(
          /\w\S*/g,
          (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        ),
    pad: (num, size) => ("00000" + num).slice(-size),
  };

  function navigateTo(pageId) {
    dom.pages.forEach((p) => p.classList.remove("active"));
    document.getElementById(pageId).classList.add("active");
    dom.navItems.forEach((n) =>
      n.classList.toggle("active", n.dataset.page === pageId)
    );
  }
  function toggleTheme() {
    const newTheme = document.body.dataset.theme === "light" ? "dark" : "light";
    document.body.dataset.theme = newTheme;
    window.api.setTitleBarTheme(newTheme);
  }
  function handleInspectorCopy(e) {
    const button = e.target.closest(".copy-json-btn");
    if (button) {
      navigator.clipboard.writeText(
        JSON.stringify(JSON.parse(button.dataset.raw), null, 2)
      );
      const icon = button.querySelector("i");
      icon.className = "fa-solid fa-check";
      setTimeout(() => (icon.className = "fa-solid fa-paste"), 2000);
    }
  }

  async function handleStitchAdd() {
    const filePaths = await window.api.openFile({
      properties: ["openFile", "multiSelections"],
    });
    if (filePaths) {
      stitchFiles.push(...filePaths);
      renderStitchList();
    }
  }
  function handleStitchRemove(e) {
    if (e.target.classList.contains("remove-stitch-item")) {
      const index = parseInt(e.target.dataset.index, 10);
      stitchFiles.splice(index, 1);
      renderStitchList();
    }
  }
  function renderStitchList() {
    dom.stitchFileList.innerHTML = stitchFiles
      .map(
        (file, index) =>
          `<div class="stitch-file-item" draggable="true" data-index="${index}"><i class="fa-solid fa-grip-lines"></i><span title="${file}">${file
            .split(/[\\/]/)
            .pop()}</span><button class="remove-stitch-item" data-index="${index}">&times;</button></div>`
      )
      .join("");
    const hasFiles = stitchFiles.length > 0;
    dom.stitchStartBtn.disabled = stitchFiles.length < 2;
    dom.stitchClearBtn.disabled = !hasFiles;
  }

  function setupDragAndDrop(container, list, renderFn) {
    let dragSrcEl = null;
    container.addEventListener("dragstart", (e) => {
      dragSrcEl = e.target;
      e.dataTransfer.effectAllowed = "move";
      e.target.classList.add("dragging");
    });
    container.addEventListener("dragend", (e) =>
      e.target.classList.remove("dragging")
    );
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    container.addEventListener("drop", (e) => {
      e.stopPropagation();
      const dropTarget = e.target.closest(".stitch-file-item");
      if (dragSrcEl && dropTarget && dragSrcEl !== dropTarget) {
        const fromIndex = parseInt(dragSrcEl.dataset.index);
        const toIndex = parseInt(dropTarget.dataset.index);
        const item = list.splice(fromIndex, 1)[0];
        list.splice(toIndex, 0, item);
        renderFn();
      }
    });
  }

  function setupTrimPage() {
    let isDraggingStart = false,
      isDraggingEnd = false;
    dom.trimVideoPlayer.addEventListener("loadedmetadata", () => {
      const duration = dom.trimVideoPlayer.duration;
      dom.trimDuration.textContent = format.duration(duration);
      dom.trimEndTimeInput.value = format.duration(duration, true);
    });
    dom.trimVideoPlayer.addEventListener("timeupdate", () => {
      const percent =
        (dom.trimVideoPlayer.currentTime / dom.trimVideoPlayer.duration) * 100;
      dom.trimPlayhead.style.left = `${percent}%`;
      dom.trimCurrentTime.textContent = format.duration(
        dom.trimVideoPlayer.currentTime
      );
    });
    dom.trimVideoPlayer.addEventListener(
      "play",
      () => (dom.trimPlayBtn.className = "fa-solid fa-pause")
    );
    dom.trimVideoPlayer.addEventListener(
      "pause",
      () => (dom.trimPlayBtn.className = "fa-solid fa-play")
    );
    dom.trimPlayBtn.addEventListener("click", () =>
      dom.trimVideoPlayer.paused
        ? dom.trimVideoPlayer.play()
        : dom.trimVideoPlayer.pause()
    );

    const updateSelection = () => {
      const start = parseFloat(dom.trimHandleStart.style.left || "0");
      const end = parseFloat(dom.trimHandleEnd.style.left || "100");
      dom.trimTimelineSelection.style.left = `${start}%`;
      dom.trimTimelineSelection.style.width = `${end - start}%`;
    };
    const handleMove = (e, handle) => {
      const rect = dom.trimTimelineContainer.getBoundingClientRect();
      let percent = ((e.clientX - rect.left) / rect.width) * 100;
      const startPercent = parseFloat(dom.trimHandleStart.style.left);
      const endPercent = parseFloat(dom.trimHandleEnd.style.left);
      if (handle === dom.trimHandleStart)
        percent = Math.max(0, Math.min(percent, endPercent));
      else percent = Math.max(startPercent, Math.min(100, percent));
      handle.style.left = `${percent}%`;
      const time = dom.trimVideoPlayer.duration * (percent / 100);
      const input =
        handle === dom.trimHandleStart
          ? dom.trimStartTimeInput
          : dom.trimEndTimeInput;
      input.value = format.duration(time, true);
      dom.trimVideoPlayer.currentTime = time;
      updateSelection();
    };

    const addDragListeners = (handle) => {
      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (handle === dom.trimHandleStart) isDraggingStart = true;
        else isDraggingEnd = true;
        dom.trimVideoPlayer.pause();
      });
    };
    window.addEventListener("mousemove", (e) => {
      if (isDraggingStart) handleMove(e, dom.trimHandleStart);
      if (isDraggingEnd) handleMove(e, dom.trimHandleEnd);
    });
    window.addEventListener("mouseup", () => {
      isDraggingStart = false;
      isDraggingEnd = false;
    });
    addDragListeners(dom.trimHandleStart);
    addDragListeners(dom.trimHandleEnd);
    updateSelection();
  }

  async function addConversionJobToQueue() {
    if (!currentFile) return;
    const container = document.getElementById("output-container").dataset.value;
    const defaultPath = currentFile.path.replace(
      /(\.[\w\d_-]+)$/i,
      `_converted.${container}`
    );
    const outputPath = await window.api.saveFile({
      defaultPath,
      filters: [{ name: "Media File", extensions: [container] }],
    });
    if (!outputPath) return;
    const jobId = `job-${Date.now()}`;
    const options = {
      inputFile: currentFile.path,
      outputFile: outputPath,
      sourceInfo: currentFile.info,
      settings: {
        video: {
          codec: document.getElementById("video-codec").dataset.value,
          crf: document.getElementById("video-crf-slider").dataset.value,
          resolution: dom.videoResolutionInput.value || null,
          framerate: dom.videoFramerateInput.value || null,
        },
        audio: {
          action: document.getElementById("audio-action").dataset.value,
          codec: document.getElementById("audio-codec").dataset.value,
          bitrate: document.getElementById("audio-bitrate").dataset.value,
        },
      },
    };
    renderJobItem(jobId, outputPath, "Converting");
    window.api.runJob({ jobId, jobType: "CONVERT", options });
  }

  async function runStitchJob() {
    if (stitchFiles.length < 2) return;
    const defaultPath = `stitched_output.mp4`;
    const outputFile = await window.api.saveFile({
      defaultPath,
      filters: [{ name: "Video", extensions: ["mp4", "mkv"] }],
    });
    if (!outputFile) return;
    const jobId = `stitch-${Date.now()}`;
    renderJobItem(jobId, outputFile, "Stitching");
    window.api.runStitchJob({ jobId, files: stitchFiles, outputFile });
  }

  async function runTrimJob() {
    if (!currentFile) return;
    const defaultPath = currentFile.path.replace(
      /(\.[\w\d_-]+)$/i,
      "_trimmed$1"
    );
    const outputPath = await window.api.saveFile({ defaultPath });
    if (!outputPath) return;
    const jobId = `trim-${Date.now()}`;
    const options = {
      inputFile: currentFile.path,
      outputFile: outputPath,
      sourceInfo: currentFile.info,
      settings: {
        trim: {
          start: dom.trimStartTimeInput.value,
          end: dom.trimEndTimeInput.value,
        },
      },
    };
    renderJobItem(jobId, outputPath, "Trimming");
    window.api.runJob({ jobId, jobType: "TRIM", options });
  }

  async function runGifJob() {
    if (!currentFile) return;
    const outputPath = await window.api.saveFile({
      defaultPath: "animated.gif",
      filters: [{ name: "GIF", extensions: ["gif"] }],
    });
    if (!outputPath) return;
    const jobId = `gif-${Date.now()}`;
    const options = {
      inputFile: currentFile.path,
      outputFile: outputPath,
      settings: {
        start: dom.trimStartTimeInput.value,
        end: dom.trimEndTimeInput.value,
        width: dom.gifWidthInput.value,
        fps: dom.gifFpsInput.value,
      },
    };
    renderJobItem(jobId, outputPath, "Creating GIF");
    window.api.runGifJob({ jobId, options });
  }

  async function runExtractAudioJob() {
    if (!currentFile) return;
    const audioStream = currentFile.info.streams.find(
      (s) => s.codec_type === "audio"
    );
    if (!audioStream) return;
    const ext =
      audioStream.codec_name === "aac" ? "m4a" : audioStream.codec_name;
    const defaultPath = currentFile.path.replace(
      /(\.[\w\d_-]+)$/i,
      `_audio.${ext}`
    );
    const outputPath = await window.api.saveFile({
      defaultPath,
      filters: [{ name: "Audio", extensions: [ext] }],
    });
    if (!outputPath) return;
    const jobId = `extract-audio-${Date.now()}`;
    const options = {
      inputFile: currentFile.path,
      outputFile: outputPath,
      sourceInfo: currentFile.info,
    };
    renderJobItem(jobId, outputPath, "Extracting Audio");
    window.api.runJob({ jobId, jobType: "EXTRACT_AUDIO", options });
  }

  async function handleSelectExtractDir() {
    const dir = await window.api.openDirectory();
    if (dir) {
      dom.extractOutputDirInput.value = dir;
      dom.extractOpenDirBtn.disabled = false;
      dom.extractFramesBtn.disabled = false;
    }
  }

  function updateEstimatedFrames() {
    if (!currentFile) return;
    const duration = parseFloat(currentFile.info.format.duration);
    const rate = parseFloat(dom.extractFpsInput.value);
    if (duration > 0 && rate > 0) {
      dom.extractInfoTotal.textContent = `${Math.ceil(duration * rate)} frames`;
    } else {
      dom.extractInfoTotal.textContent = "N/A";
    }
  }

  async function runExtractFramesJob() {
    if (!currentFile) return;
    const videoStream = currentFile.info.streams.find(
      (s) => s.codec_type === "video"
    );
    if (!videoStream) return;

    const outputDir = dom.extractOutputDirInput.value;
    if (!outputDir) return;

    dom.extractResultsContainer.classList.remove("hidden");
    dom.extractPreviewGallery.innerHTML = "";

    const jobId = `extract-frames-${Date.now()}`;
    const fps = parseFloat(dom.extractFpsInput.value);
    const duration = parseFloat(currentFile.info.format.duration);
    const totalFrames = Math.floor(duration * fps);
    const format = dom.extractFormatGroup.dataset.value;

    extractionJobs[jobId] = { outputDir, format, imagePaths: [] };

    const options = {
      inputFile: currentFile.path,
      outputFile: outputDir,
      sourceInfo: currentFile.info,
      totalFrames: totalFrames,
      settings: { fps, format },
    };
    window.api.runJob({ jobId, jobType: "EXTRACT_FRAMES", options });
    updateStatus("Extraction started...", "processing");
  }

  function renderJobItem(jobId, outputPath, type = "Processing") {
    const jobEl = document.createElement("div");
    jobEl.className = "job-item";
    jobEl.id = jobId;
    jobEl.innerHTML = `<div class="job-header"><span class="job-filename" title="${outputPath}">${outputPath
      .split(/[\\/]/)
      .pop()}</span><span class="job-status">Waiting</span></div><div class="job-progress-bar"><div></div></div><div class="job-footer hidden"><span>${type}</span><button class="button show-file-btn" data-path="${outputPath}"><i class="fa-solid fa-folder"></i> Show File</button></div>`;
    dom.jobQueueList.prepend(jobEl);
  }

  function handleJobFeedback(feedback) {
    const {
      jobId,
      type,
      message,
      progress,
      frame,
      totalFrames,
      outputFile,
      statusText,
      finalFrame,
    } = feedback;

    if (jobId.startsWith("extract-frames")) {
      handleExtractJobFeedback(feedback);
      return;
    }

    const jobEl = document.getElementById(jobId);
    if (!jobEl) return;
    const statusEl = jobEl.querySelector(".job-status");
    const progressEl = jobEl.querySelector(".job-progress-bar div");
    const footerEl = jobEl.querySelector(".job-footer");

    switch (type) {
      case "start":
        statusEl.textContent = "Processing";
        jobEl.classList.add("processing");
        break;
      case "log":
        if (progress !== undefined) progressEl.style.width = `${progress}%`;
        if (statusText) statusEl.textContent = statusText;
        break;
      case "success":
        statusEl.textContent = "Completed";
        jobEl.className = "job-item success";
        progressEl.style.width = "100%";
        footerEl.classList.remove("hidden");
        if (outputFile)
          footerEl.querySelector(".show-file-btn").dataset.path = outputFile;
        break;
      case "error":
        statusEl.textContent = `Error`;
        jobEl.className = "job-item error";
        progressEl.style.width = "100%";
        footerEl.classList.remove("hidden");
        jobEl.querySelector(".job-filename").title = message;
        break;
    }
  }

  function handleExtractJobFeedback({ jobId, type, message, finalFrame }) {
    if (type === "success") {
      const jobData = extractionJobs[jobId];
      const imagePaths = [];
      for (let i = 1; i <= finalFrame; i++) {
        const fileName = `frame-${format.pad(i, 5)}.${jobData.format}`;
        const filePath = `${jobData.outputDir}\\${fileName}`.replace(
          /\\/g,
          "/"
        );
        imagePaths.push(filePath);
      }
      jobData.imagePaths = imagePaths;
      renderExtractionPreview(jobId, imagePaths);
      updateStatus(`Extraction complete: ${finalFrame} frames`, "success");
    } else if (type === "error") {
      updateStatus(`Extraction failed: ${message}`, "error");
    }
  }

  function renderExtractionPreview(jobId, imagePaths) {
    dom.extractResultsContainer.classList.remove("hidden");
    const gallery = dom.extractPreviewGallery;
    gallery.innerHTML = "";
    imagePaths.forEach((path, index) => {
      const thumb = document.createElement("div");
      thumb.className = "preview-thumbnail";
      thumb.dataset.index = index;
      thumb.dataset.jobId = jobId;
      thumb.innerHTML = `<img src="file://${path}" loading="lazy">`;
      gallery.appendChild(thumb);
    });
  }

  function setupImageViewer() {
    dom.viewerClose.addEventListener("click", () =>
      dom.imageViewer.classList.add("hidden")
    );
    dom.viewerPrev.addEventListener("click", () => navigateImageViewer(-1));
    dom.viewerNext.addEventListener("click", () => navigateImageViewer(1));
    document.addEventListener("keydown", (e) => {
      if (!dom.imageViewer.classList.contains("hidden")) {
        if (e.key === "ArrowLeft") navigateImageViewer(-1);
        if (e.key === "ArrowRight") navigateImageViewer(1);
        if (e.key === "Escape") dom.imageViewer.classList.add("hidden");
      }
    });
  }

  function openImageViewer(paths, index) {
    currentImageViewer = { paths, index };
    dom.imageViewer.classList.remove("hidden");
    updateImageViewer();
  }

  function navigateImageViewer(direction) {
    const { paths, index } = currentImageViewer;
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < paths.length) {
      currentImageViewer.index = newIndex;
      updateImageViewer();
    }
  }

  function updateImageViewer() {
    const { paths, index } = currentImageViewer;
    dom.viewerImage.src = `file://${paths[index]}`;
    dom.viewerPrev.disabled = index === 0;
    dom.viewerNext.disabled = index === paths.length - 1;
  }

  function updateStatus(text, state) {
    dom.statusText.textContent = text;
    dom.statusBarProgress.style.transition =
      state === "processing" ? "width 0.3s ease" : "none";
    if (state !== "processing") dom.statusBarProgress.style.width = "0%";
    dom.statusText.style.color =
      state === "success"
        ? "var(--success)"
        : state === "error"
        ? "var(--error)"
        : "var(--text-secondary)";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // --- GLOBAL STATE ---
  let currentFile = null;

  // --- DOM ELEMENT CACHE ---
  const dom = {
    navItems: document.querySelectorAll(".nav-item"),
    pages: document.querySelectorAll(".page"),
    themeToggleBtn: document.getElementById("theme-toggle-btn"),
    statusText: document.getElementById("status-text"),
    statusBarProgress: document.getElementById("status-progress-bar"),
    browseFileDashboardBtn: document.getElementById("browse-file-dashboard"),
    dashboardWelcome: document.getElementById("dashboard-welcome"),
    dashboardPreview: document.getElementById("dashboard-preview"),
    dashboardInfoPanel: document.getElementById("dashboard-info"),
    browseFileInspectBtn: document.getElementById("browse-file-inspect"),
    inspectContainer: document.getElementById("inspect-container"),
    convertPage: document.getElementById("page-convert"),
    convertSourceFile: document.getElementById("convert-source-file"),
    convertTabs: document.querySelectorAll(".tab-item"),
    convertTabContents: document.querySelectorAll(
      ".convert-settings .tab-content"
    ),
    addToQueueBtn: document.getElementById("add-to-queue-btn"),
    jobQueueList: document.getElementById("job-queue-list"),
    trimPage: document.getElementById("page-trim"),
    trimSourceFile: document.getElementById("trim-source-file"),
    trimStartBtn: document.getElementById("trim-start-btn"),
    trimStartInput: document.getElementById("trim-start"),
    trimEndInput: document.getElementById("trim-end"),
    audioPage: document.getElementById("page-audio"),
    audioSourceFile: document.getElementById("audio-source-file"),
    extractAudioBtn: document.getElementById("extract-audio-btn"),
    extractPage: document.getElementById("page-extract"),
    extractSourceFile: document.getElementById("extract-source-file"),
    extractFpsInput: document.getElementById("extract-fps"),
    extractStartBtn: document.getElementById("extract-start-btn"),
    extractInfoDuration: document.getElementById("extract-info-duration"),
    extractInfoFps: document.getElementById("extract-info-fps"),
    extractInfoTotal: document.getElementById("extract-info-total"),
    extractInfoDisplay: document.getElementById("extract-info-display"),
    extractJobDisplay: document.getElementById("extract-job-display"),
    extractJobStatusText: document.getElementById("extract-job-status-text"),
    extractJobProgress: document.getElementById("extract-job-progress"),
    extractJobOutputPath: document.getElementById("extract-job-output-path"),
    extractOpenFolderBtn: document.getElementById("extract-open-folder-btn"),
  };

  // --- INITIALIZATION ---
  setupEventListeners();

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    dom.themeToggleBtn.addEventListener("click", toggleTheme);
    dom.navItems.forEach((item) =>
      item.addEventListener("click", () => navigateTo(item.dataset.page))
    );

    document.querySelectorAll(".button[id^='browse-file-']").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const filePath = await window.api.openFile();
        if (filePath) loadFile(filePath);
      });
    });

    const appBody = document.body;
    appBody.addEventListener(
      "dragover",
      (e) => {
        e.preventDefault();
        dom.dashboardWelcome.classList.add("drag-over");
      },
      false
    );
    appBody.addEventListener(
      "dragleave",
      () => dom.dashboardWelcome.classList.remove("drag-over"),
      false
    );
    appBody.addEventListener(
      "drop",
      (e) => {
        e.preventDefault();
        dom.dashboardWelcome.classList.remove("drag-over");
        if (e.dataTransfer.files[0])
          loadFile(e.dataTransfer.files[0].path, true);
      },
      false
    );

    dom.convertTabs.forEach((tab) =>
      tab.addEventListener("click", handleConvertTabClick)
    );
    dom.addToQueueBtn.addEventListener("click", addConversionJobToQueue);
    dom.trimStartBtn.addEventListener("click", runTrimJob);
    dom.extractAudioBtn.addEventListener("click", runExtractAudioJob);
    dom.extractStartBtn.addEventListener("click", runExtractFramesJob);
    dom.extractFpsInput.addEventListener("input", updateExtractEstimation);
    dom.extractOpenFolderBtn.addEventListener("click", () => {
      const path = dom.extractOpenFolderBtn.dataset.path;
      if (path) window.api.openPath(path);
    });

    window.api.onJobFeedback(([feedback]) => handleJobFeedback(feedback));

    setupCustomComponentHandlers(dom.convertPage);
    setupCustomComponentHandlers(dom.extractPage);
    setupSlider(document.getElementById("video-crf-slider"));
    updateConvertFormState();

    dom.inspectContainer.addEventListener("click", (e) => {
      const button = e.target.closest(".copy-json-btn");
      if (button) {
        const rawData = button.dataset.raw;
        navigator.clipboard.writeText(
          JSON.stringify(JSON.parse(rawData), null, 2)
        );
        button.innerHTML = "Copied!";
        setTimeout(
          () =>
            (button.innerHTML = `<i class="fa-solid fa-paste"></i> Copy JSON`),
          2000
        );
      }
    });
  }

  // --- CUSTOM COMPONENT LOGIC ---
  function setupCustomComponentHandlers(container) {
    container.addEventListener("click", (e) => {
      if (e.target.classList.contains("button-group-item")) {
        const group = e.target.parentElement;
        [...group.children].forEach((child) =>
          child.classList.remove("active")
        );
        e.target.classList.add("active");
        group.dataset.value = e.target.dataset.value;
        if (group.id === "video-codec" || group.id === "audio-action") {
          updateConvertFormState();
        }
      }
      if (e.target.classList.contains("preset-button")) {
        const wrapper = e.target.closest(".input-with-presets, .form-group");
        const input = wrapper.querySelector("input");
        if (input) {
          input.value = e.target.dataset.value;
          input.dispatchEvent(new Event("input"));
        }
        const slider = wrapper.querySelector(".slider-container");
        if (slider) updateSlider(slider, e.target.dataset.value);
      }
    });
  }

  function setupSlider(slider) {
    const thumb = slider.querySelector(".slider-thumb");
    const track = slider.querySelector(".slider-track");
    let isDragging = false;
    const moveHandler = (e) => {
      if (!isDragging) return;
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      let percent = Math.max(0, Math.min(1, x / width));
      const min = parseFloat(slider.dataset.min);
      const max = parseFloat(slider.dataset.max);
      const value = Math.round(min + percent * (max - min));
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
    const min = parseFloat(slider.dataset.min);
    const max = parseFloat(slider.dataset.max);
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
      .querySelectorAll(".video-options")
      .forEach((el) => el.classList.toggle("disabled", isVideoCopy));
    const showAudioOptions =
      document.getElementById("audio-action").dataset.value === "convert";
    document
      .querySelectorAll(".audio-options")
      .forEach((el) => el.classList.toggle("disabled", !showAudioOptions));
  }

  // --- STATE MANAGEMENT & UI UPDATES ---
  async function loadFile(filePath, autoNavigateToInspect = false) {
    try {
      updateStatus(`Probing file...`, "processing");
      const mediaInfo = await window.api.getMediaInfo(filePath);
      currentFile = { path: filePath, info: mediaInfo };
      updateStatus(`Loaded: ${filePath.split(/[\\/]/).pop()}`, "ready");
      updateAllPagesWithNewFile();
      if (autoNavigateToInspect) navigateTo("page-inspect");
    } catch (error) {
      console.error(error);
      currentFile = null;
      updateStatus(`Error loading file: ${error}`, "error");
    }
  }

  async function updateAllPagesWithNewFile() {
    if (!currentFile) return;
    const { path, info } = currentFile;
    const fileName = path.split(/[\\/]/).pop();
    const videoStream = info.streams.find((s) => s.codec_type === "video");

    // Dashboard
    dom.dashboardWelcome.classList.add("hidden");
    dom.dashboardPreview.classList.remove("hidden");
    dom.dashboardInfoPanel.classList.remove("hidden");
    if (videoStream) {
      try {
        const thumbPath = await window.api.generatePreview(path);
        dom.dashboardPreview.innerHTML = `
            <img src="${thumbPath.replace(
              /\\/g,
              "/"
            )}" class="preview-image" alt="Video Thumbnail">
            <div class="preview-details">
                <h2 title="${path}">${fileName}</h2>
                <p>${videoStream.width}x${
          videoStream.height
        } &nbsp;&bull;&nbsp; ${format.duration(info.format.duration)}</p>
            </div>`;
      } catch (e) {
        console.error(e);
      }
    } else {
      dom.dashboardPreview.innerHTML = `
        <i class="fa-solid fa-music preview-audio-icon"></i>
        <div class="preview-details">
            <h2 title="${path}">${fileName}</h2>
            <p>${
              info.streams[0].codec_long_name
            } &nbsp;&bull;&nbsp; ${format.duration(info.format.duration)}</p>
        </div>`;
    }

    renderInspectorUI(info);

    // Update all source spans and enable buttons
    document
      .querySelectorAll("span[id$='-source-file']")
      .forEach((span) => (span.textContent = path));
    dom.addToQueueBtn.disabled = false;
    dom.trimStartBtn.disabled = false;
    dom.extractAudioBtn.disabled = false;
    dom.extractStartBtn.disabled = !videoStream;

    dom.trimEndInput.value = format.duration(info.format.duration);
    dom.trimStartInput.value = "00:00:00";

    // Update Extract Page Info
    if (videoStream) updateExtractEstimation();
  }

  function updateExtractEstimation() {
    if (!currentFile) return;
    const videoStream = currentFile.info.streams.find(
      (s) => s.codec_type === "video"
    );
    if (!videoStream) return;
    const duration = parseFloat(currentFile.info.format.duration);
    const extractFps = parseFloat(dom.extractFpsInput.value) || 0;
    const totalFrames = Math.floor(duration * extractFps);

    dom.extractInfoDuration.textContent = format.duration(duration);
    dom.extractInfoFps.textContent = format.frameRate(videoStream.r_frame_rate);
    dom.extractInfoTotal.textContent = `~ ${totalFrames.toLocaleString()}`;
  }

  function renderInspectorUI(mediaInfo) {
    dom.inspectContainer.innerHTML = "";
    const { format: fileFormat, streams } = mediaInfo;
    const fileCard = createCard("File", "fa-file-lines", fileFormat);
    fileCard.querySelector(".card-body").innerHTML = [
      createProperty("Container", fileFormat.format_long_name),
      createProperty("Size", format.bytes(fileFormat.size)),
      createProperty("Duration", format.duration(fileFormat.duration)),
      createProperty("Bitrate", format.bitrate(fileFormat.bit_rate)),
      createProperty("Streams", fileFormat.nb_streams),
    ].join("");
    dom.inspectContainer.appendChild(fileCard);
    if (fileFormat.tags && Object.keys(fileFormat.tags).length > 0) {
      const tagsCard = createCard("Tags", "fa-tags", fileFormat);
      const tagsBody = tagsCard.querySelector(".card-body");
      tagsBody.className = "card-body tags-body";
      tagsBody.innerHTML = Object.entries(fileFormat.tags)
        .map(
          ([key, value]) =>
            `<div class="property-key">${format.titleCase(
              key
            )}</div><div class="property-value ${
              value.length > 100 ? "long-text" : ""
            }" title="${value}">${value}</div>`
        )
        .join("");
      dom.inspectContainer.appendChild(tagsCard);
    }
    streams.forEach((stream) => {
      let card;
      if (stream.codec_type === "video") {
        card = createCard(`Video Stream #${stream.index}`, "fa-film", stream);
        card.querySelector(".card-body").innerHTML = [
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
          createProperty(
            "Color Space",
            `${stream.color_space} / ${stream.color_primaries} / ${stream.color_transfer}`
          ),
        ].join("");
      } else if (stream.codec_type === "audio") {
        card = createCard(
          `Audio Stream #${stream.index}`,
          "fa-waveform",
          stream
        );
        card.querySelector(".card-body").innerHTML = [
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
          createProperty("Language", stream.tags?.language?.toUpperCase()),
        ].join("");
      } else {
        card = createCard(
          `${format.titleCase(stream.codec_type)} Stream #${stream.index}`,
          "fa-closed-captioning",
          stream
        );
        card.querySelector(".card-body").innerHTML = [
          createProperty(
            "Codec",
            `${stream.codec_long_name} (${stream.codec_name})`,
            true
          ),
          createProperty("Language", stream.tags?.language?.toUpperCase()),
        ].join("");
      }
      if (card) dom.inspectContainer.appendChild(card);
    });
  }

  function createCard(title, icon, rawData) {
    const card = document.createElement("div");
    card.className = "info-card";
    card.innerHTML = `<div class="card-header"><h3><i class="fa-solid ${icon}"></i> ${title}</h3><button class="button copy-json-btn" data-raw='${JSON.stringify(
      rawData
    )}'><i class="fa-solid fa-paste"></i> Copy JSON</button></div><div class="card-body"></div>`;
    return card;
  }

  function createProperty(key, value, isBadge = false) {
    if (!value || value === "N/A" || value === "0 x 0") return "";
    return `<div class="property-key">${key}</div><div class="property-value ${
      isBadge ? "badge" : ""
    }" title="${value}">${value}</div>`;
  }

  const format = {
    bytes: (b, d = 2) => {
      if (b === 0 || !b) return "0 Bytes";
      const k = 1024,
        s = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(b) / Math.log(k));
      return parseFloat((b / Math.pow(k, i)).toFixed(d)) + " " + s[i];
    },
    duration: (s) => new Date(s * 1000).toISOString().substr(11, 8),
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

  function handleConvertTabClick(e) {
    dom.convertTabs.forEach((tab) => tab.classList.remove("active"));
    dom.convertTabContents.forEach((content) =>
      content.classList.remove("active")
    );
    e.currentTarget.classList.add("active");
    document
      .getElementById(`tab-${e.currentTarget.dataset.tab}`)
      .classList.add("active");
  }

  // --- JOB EXECUTION ---
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
    const options = {
      inputFile: currentFile.path,
      outputFile: outputPath,
      sourceInfo: currentFile.info,
      settings: {
        video: {
          codec: document.getElementById("video-codec").dataset.value,
          crf: document.getElementById("video-crf-slider").dataset.value,
          bitrate: document.getElementById("video-bitrate").value,
          resolution: document.getElementById("video-resolution").value,
          framerate: document.getElementById("video-framerate").value,
          pix_fmt: document.getElementById("video-pix_fmt").dataset.value,
          gop: document.getElementById("video-gop").value,
        },
        audio: {
          action: document.getElementById("audio-action").dataset.value,
          codec: document.getElementById("audio-codec").dataset.value,
          bitrate: document.getElementById("audio-bitrate").dataset.value,
          samplerate: document.getElementById("audio-samplerate").dataset.value,
        },
        output: {
          timeLimit: document.getElementById("output-time-limit").value,
          bufferSize: document.getElementById("output-buffer-size").value,
        },
      },
    };
    renderJobItem(`job-${Date.now()}`, outputPath);
    window.api.runJob({
      jobId: `job-${Date.now()}`,
      jobType: "CONVERT",
      options,
    });
  }

  async function runExtractFramesJob() {
    if (!currentFile) return;
    const outputDir = await window.api.openDirectory();
    if (!outputDir) return updateStatus("Frame extraction cancelled.", "ready");

    const totalFrames = Math.floor(
      parseFloat(currentFile.info.format.duration) *
        parseFloat(dom.extractFpsInput.value)
    );
    const jobId = `extract-${Date.now()}`;
    const options = {
      inputFile: currentFile.path,
      outputFile: outputDir, // For this job type, it's a directory
      sourceInfo: currentFile.info,
      totalFrames,
      settings: {
        fps: dom.extractFpsInput.value,
        format: document.getElementById("extract-format").dataset.value,
      },
    };

    dom.extractInfoDisplay.classList.add("hidden");
    dom.extractJobDisplay.classList.remove("hidden");
    dom.extractOpenFolderBtn.classList.add("hidden");
    dom.extractJobProgress.style.width = "0%";
    dom.extractJobStatusText.textContent = "Preparing to extract...";
    dom.extractJobOutputPath.textContent = outputDir;
    dom.extractOpenFolderBtn.dataset.path = outputDir;

    window.api.runJob({ jobId, jobType: "EXTRACT_FRAMES", options });
  }

  async function runTrimJob() {
    if (!currentFile) return;
    const defaultPath = currentFile.path.replace(
      /(\.[\w\d_-]+)$/i,
      "_trimmed$1"
    );
    const outputPath = await window.api.saveFile({ defaultPath });
    if (!outputPath) return updateStatus("Trim cancelled.", "ready");
    const options = {
      inputFile: currentFile.path,
      outputFile: outputPath,
      sourceInfo: currentFile.info,
      settings: {
        trim: { start: dom.trimStartInput.value, end: dom.trimEndInput.value },
      },
    };
    window.api.runJob({
      jobId: `trim-${Date.now()}`,
      jobType: "TRIM",
      options,
    });
  }

  async function runExtractAudioJob() {
    if (!currentFile) return;
    const audioStream = currentFile.info.streams.find(
      (s) => s.codec_type === "audio"
    );
    if (!audioStream)
      return updateStatus("Error: No audio stream found.", "error");
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
    if (!outputPath) return updateStatus("Extraction cancelled.", "ready");
    const options = {
      inputFile: currentFile.path,
      outputFile: outputPath,
      sourceInfo: currentFile.info,
    };
    window.api.runJob({
      jobId: `extract-${Date.now()}`,
      jobType: "EXTRACT_AUDIO",
      options,
    });
  }

  // --- JOB RENDERING & FEEDBACK ---
  function renderJobItem(jobId, outputPath) {
    const jobEl = document.createElement("div");
    jobEl.className = "job-item";
    jobEl.id = jobId;
    jobEl.innerHTML = `<div class="job-header"><span>${outputPath
      .split(/[\\/]/)
      .pop()}</span><span class="job-status">Queued</span></div><div class="job-progress-bar"><div></div></div>`;
    dom.jobQueueList.prepend(jobEl);
  }

  function handleJobFeedback(feedback) {
    const { jobId, type, message, progress, frame, totalFrames } = feedback;

    if (jobId.startsWith("extract-")) {
      switch (type) {
        case "start":
          dom.extractJobStatusText.textContent = `Process started...`;
          break;
        case "log":
          if (frame && totalFrames) {
            const percent = Math.min(100, (frame / totalFrames) * 100);
            dom.extractJobProgress.style.width = `${percent}%`;
            dom.extractJobStatusText.textContent = `Extracting frame ${frame} of ${totalFrames}...`;
          }
          break;
        case "success":
          dom.extractJobProgress.style.width = `100%`;
          dom.extractJobStatusText.textContent = `Extraction complete! ${totalFrames} frames saved.`;
          dom.extractOpenFolderBtn.classList.remove("hidden");
          updateStatus("Frame extraction successful.", "success");
          break;
        case "error":
          dom.extractJobStatusText.textContent = `Error: ${message}`;
          updateStatus("Frame extraction failed.", "error");
          break;
      }
    } else if (jobId.startsWith("job-")) {
      const jobEl = document.getElementById(jobId);
      if (!jobEl) return;
      const statusEl = jobEl.querySelector(".job-status");
      const progressEl = jobEl.querySelector(".job-progress-bar div");
      switch (type) {
        case "start":
          statusEl.textContent = "Processing";
          jobEl.classList.add("processing");
          break;
        case "log":
          if (progress !== undefined) progressEl.style.width = `${progress}%`;
          break;
        case "success":
          statusEl.textContent = "Completed";
          jobEl.className = "job-item success";
          progressEl.style.width = "100%";
          break;
        case "error":
          statusEl.textContent = "Error";
          jobEl.className = "job-item error";
          break;
      }
    } else {
      // Global feedback
      switch (type) {
        case "start":
          updateStatus(message, "processing");
          break;
        case "log":
          if (progress !== undefined) {
            dom.statusBarProgress.style.width = `${progress}%`;
            dom.statusText.textContent = `Processing... ${progress.toFixed(
              1
            )}%`;
          }
          break;
        case "success":
          updateStatus(message, "success");
          break;
        case "error":
          updateStatus(message, "error");
          break;
      }
    }
  }

  function updateStatus(text, state) {
    dom.statusText.textContent = text;
    dom.statusBarProgress.style.transition =
      state === "processing" ? "width 0.3s ease" : "none";
    if (state !== "processing") dom.statusBarProgress.style.width = "0%";
    if (state === "success") dom.statusText.style.color = "var(--success)";
    else if (state === "error") dom.statusText.style.color = "var(--error)";
    else dom.statusText.style.color = "var(--text-secondary)";
  }
});

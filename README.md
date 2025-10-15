<img src="./assets/Banner.png"></img>

<p align="center">
  <img alt="Release" src="https://img.shields.io/github/v/release/Md-Siam-Mia-Man/ffusion?style=for-the-badge">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows-0078D6?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/github/license/Md-Siam-Mia-Man/ffusion?style=for-the-badge&color=48bb78">
</p>

**FFusion** is a powerful, modern desktop GUI for the [FFmpeg](https://ffmpeg.org/) command-line tool. Built with Electron, it's designed to be a versatile media toolkit that simplifies your video and audio processing workflow without sacrificing control.

---

## ✨ Features

FFusion provides a clean, job-based interface for FFmpeg's most essential functions.

- **🖼️ Unified Dashboard & Inspector:** Drag and drop any media file to get an instant preview and a deep dive into its technical properties. View comprehensive information about the container, video streams, audio streams, and metadata all in one place. An Actions Panel then guides you to the right tool for the job.
- **⚙️ Advanced Conversion:** A feature-rich panel for converting media with fine-grained control over:
  - **Video:** H.264/H.265 encoding with CRF quality control, bitrate, resolution scaling, and frame rate adjustments.
  - **Audio:** Copy, convert (to AAC, MP3, etc.), or remove audio tracks.
  - **Output:** Select your desired container (MP4, MKV, MOV, etc.).
- **✂️ Essential Tools:**
  - **Interactive Trimming & GIF Creation:** Visually and precisely cut segments from your media using a live preview and a timeline with draggable handles. Export the trimmed selection as a high-quality animated GIF with custom size and FPS.
  - **Video Stitching:** Merge multiple video clips into a single file. Drag and drop to reorder your clips before processing.
  - **Extract Audio:** Rip the audio track from a video file without re-encoding.
  - **Frame Extraction:** A dedicated tool to pull still image frames (JPG/PNG) from a video at a specified rate.
- **💡 UI & UX:**
  - **Processing Queue:** Add multiple configured jobs (conversions, trims, etc.) to a central queue.
  - **Real-time Progress:** Monitor each job's progress and see detailed FFmpeg logs as they happen.
  - **Theming:** Switch between a crisp light theme and a focused dark theme.

## 📦 Installation

1.  Go to the [**Releases Page**](https://github.com/your-username/ffusion/releases).
2.  Download the latest `FFusion-Installer-vX.X.X.exe` file.
3.  Run the installer and follow the on-screen instructions.

## 👨‍💻 Development Setup

Interested in contributing or running the app from the source? Here’s how:

#### Prerequisites

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [Git LFS](https://git-lfs.com) (for handling binaries)
- [Inno Setup](https://jrsoftware.org/isinfo.php) (for building the installer)

#### Steps

1.  **Clone the repository (with LFS):**

    ```bash
    # Make sure Git LFS is installed first!
    git lfs install
    git clone https://github.com/Md-Siam-Mia-Man/FFUSION.git
    cd FFUSION
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Run the app in development mode:**

    ```bash
    npm start
    ```

    The application will launch with the developer tools automatically opened.

4.  **Build the installer:**
    ```bash
    npm run build
    ```
    The final installer will be located in the `/release` directory.

## 🤝 Contributing

Contributions are welcome! If you have a feature request, bug report, or want to contribute to the code, please feel free to open an issue or submit a pull request.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

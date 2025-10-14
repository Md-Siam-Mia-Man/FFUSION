# Kinetica

A powerful, beautiful, and modern desktop GUI for the FFmpeg command-line tool. Built with Electron and Node.js.

## Features

- **Modern, Job-Based UI:** A clean, intuitive interface for managing your media encoding tasks.
- **Comprehensive Encoding Options:**
  - **Video:** H.264/H.265 encoding with CRF quality control, resolution scaling, and stream copying.
  - **Audio:** Copy, convert (to AAC, MP3, etc.), or remove audio tracks.
  - **Trimming:** Easily cut segments from your media with precise start/end times.
- **Real-time Progress & Logs:** Monitor each job's progress and see detailed FFmpeg logs as they happen.
- **Job Queue:** Add multiple configured jobs to the queue for processing.
- **Theming:** Switch between a crisp light theme and a focused dark theme.
- **Extensible:** The architecture is designed to be easily expanded with more FFmpeg features like filters, subtitles, and more.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Desktop Framework:** Electron with Node.js
- **Core Tools:** FFmpeg, FFprobe

## Setup and Installation

### 1. Prerequisites

- [Node.js](https://nodejs.org/) and `npm`
- **FFmpeg & FFprobe Binaries:** You must download the binaries for your operating system from the [official FFmpeg website](https://ffmpeg.org/download.html).

### 2. Place Binaries

Place the `ffmpeg` and `ffprobe` executable files (e.g., `ffmpeg.exe` and `ffprobe.exe` on Windows) inside the `binaries/` directory at the root of the project.

### 3. Install Dependencies

Install the Node.js dependencies for the Electron app:

```bash
npm install
```

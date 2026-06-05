# 🤖 AutoCompute — Playwright AI Browser Platform

<div align="center">

![AutoCompute](https://img.shields.io/badge/AutoCompute-Playwright%20AI-blueviolet?style=for-the-badge&logo=googlechrome)
![Version](https://img.shields.io/badge/version-1.61.0--next-brightgreen?style=for-the-badge)
![Chromium](https://img.shields.io/badge/Chromium-149.0.7827-blue?style=for-the-badge&logo=googlechrome)
![Node](https://img.shields.io/badge/Node.js-v26+-green?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/license-Apache%202.0-orange?style=for-the-badge)
![Status](https://img.shields.io/badge/status-Active%20Development-success?style=for-the-badge)

**A fully automated, AI-powered browser platform built on Playwright.**  
*Automate anything. Test everything. Control browsers with AI.*

[🚀 Quick Start](#-quick-start) • [📦 Installation](#-installation) • [🤖 AI Features](#-ai-features) • [📋 Architecture](#-architecture) • [🗺️ Roadmap](#️-roadmap)

</div>

---

## 📌 What is AutoCompute?

AutoCompute is a **production-grade AI browser automation platform** built on top of [Microsoft Playwright](https://github.com/microsoft/playwright). It extends Playwright with:

- 🤖 **Built-in AI control** via MCP (Model Context Protocol)
- 🧩 **Chrome Extension** with AI sidebar
- 🔄 **Full browser automation** — headless & headed
- 📊 **Real-time dashboards** for monitoring
- 🛡️ **Zero-config security** with profile isolation

---

## 🏗️ Architecture

```
autocompute/
├── 📦 packages/
│   ├── playwright-core/          # Core browser automation engine
│   │   ├── src/
│   │   │   ├── client/           # Client-side API (Page, Frame, Locator...)
│   │   │   ├── server/           # Browser server & dispatchers
│   │   │   ├── tools/
│   │   │   │   ├── mcp/          # 🤖 AI/MCP integration layer
│   │   │   │   ├── cli-client/   # CLI tools
│   │   │   │   └── dashboard/    # Real-time browser dashboard
│   │   │   └── protocol/         # RPC protocol layer
│   │   └── lib/                  # Compiled output (auto-generated)
│   │
│   ├── playwright/               # Main public package
│   ├── playwright-test/          # Test runner (@playwright/test)
│   ├── playwright-client/        # Standalone client
│   ├── extension/                # 🧩 Chrome Extension (AI sidebar)
│   ├── html-reporter/            # Beautiful HTML test reports
│   ├── trace-viewer/             # Visual trace debugger
│   ├── recorder/                 # Auto test code recorder
│   ├── dashboard/                # Live browser monitoring UI
│   └── trace/                    # Trace file utilities
│
├── 🧪 tests/
│   ├── page/                     # Page interaction tests
│   ├── library/                  # Browser/context lifecycle tests
│   ├── mcp/                      # AI/MCP tools tests (90+ specs)
│   ├── playwright-test/          # Test runner tests
│   ├── components/               # Component testing
│   └── electron/                 # Electron app tests
│
├── 📚 docs/src/                  # API documentation (source of truth)
├── 🔧 utils/                     # Build scripts, code generators
├── 🌐 browser_patches/           # Custom browser engine patches
└── 💡 examples/                  # Real-world usage examples
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js `>= 18` (v26+ recommended)
- npm `>= 9`
- Windows / macOS / Linux

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/hacker-b2k/playwrite.git
cd playwrite

# 2. Install dependencies
npm install

# 3. Build the project
npm run build

# 4. Install Chromium browser
node packages/playwright/cli.js install chromium

# 5. Verify installation
node packages/playwright/cli.js --version
```

---

## 🤖 AI Features

### 1. MCP Server (AI Browser Control)
```bash
# Start MCP server — AI agents can control the browser
node packages/playwright/cli.js mcp --port 3000
```

Connect any AI (Claude, GPT-4, Gemini) to this MCP endpoint and let it:
- Navigate pages
- Click elements
- Fill forms
- Extract data
- Take screenshots
- Run JavaScript

### 2. Chrome Extension (AI Sidebar)
Built-in Chrome extension with AI panel — visible on every webpage.
```bash
# Build extension
cd packages/extension && npm run build
# Load from: packages/extension/dist/
```

### 3. Automated Code Generation
```bash
# Open page + auto-generate test code from your actions
node packages/playwright/cli.js codegen https://your-site.com
```

---

## 📦 Available Commands

```bash
# Browser Control
node packages/playwright/cli.js open <url>           # Open in browser
node packages/playwright/cli.js cr <url>             # Chromium
node packages/playwright/cli.js ff <url>             # Firefox
node packages/playwright/cli.js wk <url>             # WebKit

# Automation
node packages/playwright/cli.js codegen <url>        # Code generator
node packages/playwright/cli.js screenshot <url> out.png
node packages/playwright/cli.js pdf <url> out.pdf

# Testing
npm run ctest                                        # Chromium tests
npm run ttest                                        # Test runner tests
npm run ctest-mcp                                    # AI/MCP tests

# Development
npm run build                                        # Full build
npm run watch                                        # Watch mode
npm run flint                                        # Lint + type check

# AI/MCP
node packages/playwright/cli.js mcp                  # Start MCP server
```

---

## 🖥️ Browser Paths

After installation, browsers are located at:

```
Windows:
  Chromium:  C:\Users\<user>\AppData\Local\ms-playwright\chromium-1226\chrome-win64\chrome.exe
  Firefox:   C:\Users\<user>\AppData\Local\ms-playwright\firefox-1528\
  WebKit:    C:\Users\<user>\AppData\Local\ms-playwright\webkit-2302\

macOS:
  ~/Library/Caches/ms-playwright/

Linux:
  ~/.cache/ms-playwright/
```

---

## 🧪 Testing

```bash
# Run specific browser tests
npm run ctest                    # Chromium only (fastest)
npm run ftest                    # Firefox only
npm run wtest                    # WebKit only

# Run with filter
npm run ctest -- --grep "click"
npm run ctest tests/page/locator-click.spec.ts

# Run AI/MCP tests
npm run ctest-mcp
```

---

## 🗺️ Roadmap

| Feature | Status |
|---|---|
| ✅ Core browser automation | Done |
| ✅ Chromium + FFmpeg installed | Done |
| ✅ MCP server (AI control) | Done |
| ✅ Chrome Extension | Done |
| ✅ Trace Viewer | Done |
| ✅ HTML Reporter | Done |
| ✅ Code Recorder | Done |
| ✅ Dashboard UI | Done |
| 🔄 GPT-4 / Claude API integration | In Progress |
| 🔄 AI Sidebar in Extension | In Progress |
| ⏳ Firefox + WebKit browsers | Pending |
| ⏳ Custom AI prompt library | Pending |
| ⏳ Real-time monitoring dashboard | Pending |
| ⏳ Docker deployment | Pending |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js v26+ |
| **Language** | TypeScript |
| **Browser Engine** | Chromium 149, Firefox 151, WebKit 26 |
| **Build Tool** | esbuild + Vite |
| **UI Framework** | React 19 |
| **AI Protocol** | MCP (Model Context Protocol) |
| **Test Framework** | @playwright/test |
| **Bundler** | esbuild |

---

## 📄 License

Apache 2.0 — see [LICENSE](./LICENSE)

---

<div align="center">

**Built with ❤️ by AutoCompute Team**  
*Powered by Microsoft Playwright*

</div>

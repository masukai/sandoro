<div align="center">

# sandoro

**Terminal-first Pomodoro timer with beautiful ASCII art animations**

[![CI](https://github.com/masukai/sandoro/actions/workflows/ci.yml/badge.svg)](https://github.com/masukai/sandoro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/Rust-1.92+-orange?logo=rust)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

<br />

```
    ╭───────────────────────────────────────╮
    │                                       │
    │           ░░▒▒▓▓████▓▓▒▒░░            │
    │           ░░▒▒▓▓████▓▓▒▒░░            │
    │               ╲      ╱                │
    │                ╲ ░░ ╱                 │
    │                 ╲▒▒╱                  │
    │                  ╳                    │
    │                 ╱▒▒╲                  │
    │                ╱ ▓▓ ╲                 │
    │               ╱      ╲                │
    │           ░░▒▒▓▓▓▓▓▓▓▓▒▒░░            │
    │           ░░▒▒▓▓████▓▓▒▒░░            │
    │                                       │
    │              [ 24:59 ]                │
    │                                       │
    ╰───────────────────────────────────────╯
```

*CLI & Web • Rich ASCII animations • Offline-ready PWA • Privacy-first*

[**Try Web Version**](https://sandoro.app) · [**Releases**](https://github.com/masukai/sandoro/releases) · [**Documentation**](docs/)

</div>

---

## Why sandoro?

| Feature | Description |
|---------|-------------|
| **Beautiful Animations** | 4-phase smooth ASCII art animations using Unicode gradients (`░▒▓█`) |
| **CLI & Web** | Same experience in terminal and browser. PWA support for offline use |
| **Privacy-First** | All data stays local. No tracking, no analytics, no cloud required |
| **Flexible** | Customizable work/break durations, themes, accent colors, and icons |
| **Track Progress** | Heatmaps, streaks, goals, and tag-based statistics |

---

## Quick Start

### Web (No installation required)

Visit **[sandoro.app](https://sandoro.app)** - works offline as a PWA

### CLI

```bash
# Run timer (TUI mode)
sandoro

# Show statistics with heatmap
sandoro stats
```

**Installation:**

```bash
# Homebrew (macOS/Linux)
brew tap masukai/sandoro && brew install sandoro

# Cargo (Rust)
cargo install sandoro
```

---

## Features

### 4 Icon Styles

| Icon | Animation |
|------|-----------|
| **Hourglass** | Sand falling/rising with 4-phase animation |
| **Tomato** | Twin cherry tomatoes with wobble effect |
| **Coffee** | Rising steam animation |
| **Progress** | Clean progress bar |

### Themes & Colors

- **7 Themes**: Default, Nord, Dracula, Solarized, Gruvbox, Monokai, Tokyo Night
- **10 Accent Colors**: Cyan, Purple, Pink, Orange, Green, Blue, Indigo, Yellow, Red, Rainbow

### Statistics

- **Heatmap**: GitHub-style contribution graph
- **Streaks**: Track your consecutive work days
- **Goals**: Set daily/weekly session and time targets
- **Tags**: Categorize sessions and view tag-based stats
- **Export**: JSON/CSV export for your data

### Context Messages

Smart messages based on time of day and your stats:
- Morning encouragement, late-night reminders
- Streak celebrations, goal progress updates
- Break-time suggestions

---

## Keyboard Shortcuts (CLI)

| Key | Action |
|:---:|--------|
| `Space` | Start / Pause |
| `r` | Reset timer |
| `R` | Full reset (including session count) |
| `s` | Skip to next phase |
| `t` | Cycle through tags |
| `Tab` | Settings |
| `q` | Quit |

---

## CLI Commands

```bash
sandoro           # Start timer (default)
sandoro start     # Start with options
sandoro stats     # Show statistics
```

### Stats Options

```bash
sandoro stats              # Today's stats (default)
sandoro stats --week       # Last 7 days
sandoro stats --month      # Last 30 days
sandoro stats --interactive  # Navigate heatmap with arrow keys
sandoro stats --by-tag     # Stats grouped by tag
sandoro stats --goals      # Show goal progress
sandoro stats --compare    # Compare with previous period
sandoro stats --export json  # Export to JSON
```

---

## Configuration

Settings are managed through the TUI (press `Tab`):

| Setting | Description | Default |
|---------|-------------|---------|
| Work Duration | Minutes per work session | 25 |
| Short Break | Minutes for short break | 5 |
| Long Break | Minutes for long break | 15 |
| Sessions | Sessions until long break | 4 |
| Auto Start | Auto-start next session | Off |
| Theme | Color theme | Default |
| Accent Color | Primary accent color | Cyan |
| Icon | Animation style | Hourglass |
| Tags | Manage custom tags | - |
| Goals | Daily/weekly targets | Not set |

---

## What is Pomodoro?

**Pomodoro Technique** is a time management method developed by Francesco Cirillo:

```
Work 25min → Break 5min → Work 25min → Break 5min → ... → Long Break 15min
```

**Why it works:**
- 25 minutes is short enough to start, long enough to focus
- Regular breaks prevent burnout
- Visible progress motivates continuation

---

## Development

```bash
# Install all tools
mise install

# CLI development
cd cli && cargo run

# Web development
cd web && npm install && npm run dev
```

---

## Privacy

**Your data stays on your device.**

- CLI: SQLite database in `~/.sandoro/`
- Web: Browser localStorage
- No external data transmission
- No analytics or tracking

See [Privacy Policy](https://sandoro.app) for details.

---

## License

[MIT License](LICENSE) © 2025 K. Masuda

---

<div align="center">

**[⬆ Back to top](#sandoro)**

Made with focus and ☕

[GitHub](https://github.com/masukai/sandoro) · [Issues](https://github.com/masukai/sandoro/issues)

</div>

# sandoro - ポモドーロタイマー 設計・計画書

## 1. プロジェクト概要

### プロダクト名

**sandoro**（サンドロ）

- 由来: sand（砂）+ pomodoro（ポモドーロ）
- コンセプト: 砂時計のアニメーションが特徴的なポモドーロタイマー
- コマンド: `sandoro start`, `sandoro stats` など

### コンセプト

ターミナルファースト + Web展開可能な、カスタマイズ性の高いポモドーロタイマー。
砂時計アニメーションで時間の経過を視覚的に表現し、統計機能で作業の振り返りをサポートする。

### 主要機能

- ポモドーロタイマー（作業25分 / 休憩5分 / 長休憩15分）
- アスキーアートアニメーション（砂時計、トマト、コーヒー等）
- カラーテーマ選択
- 統計・記録機能（日次/週次/月次）- CLI/Web両方で閲覧可能
- フリーミアム課金モデル

### ターゲットプラットフォーム

1. **CLI版**: ターミナルで動作（軽量・高速）
2. **Web版**: ブラウザで動作（PWA対応）

---

## 2. 技術スタック

### 開発環境管理: mise

プロジェクト全体を mise で統一管理する。

### モノレポ構成

```
sandoro/
├── .mise.toml                 # mise設定（ルート）
├── README.md
├── LICENSE
│
├── cli/                       # Rust CLI
│   ├── Cargo.toml
│   └── src/
│
├── web/                       # React Web
│   ├── package.json
│   └── src/
│
├── shared/                    # 共有リソース
│   ├── themes/
│   │   ├── default.toml
│   │   ├── nord.toml
│   │   └── dracula.toml
│   ├── icons/                 # アスキーアートアイコン定義
│   │   ├── hourglass.txt
│   │   ├── tomato.txt
│   │   ├── coffee.txt
│   │   ├── target.txt
│   │   ├── fire.txt
│   │   └── star.txt
│   └── schema.sql             # DB共通スキーマ
│
├── docs/
│   └── SPEC.md
│
└── homebrew/                  # Homebrew Formula
    └── sandoro.rb
```

### .mise.toml

```toml
[tools]
rust = "1.75"
node = "20"
pnpm = "8"

[env]
SANDORO_ENV = "development"

[tasks.dev-cli]
description = "Run CLI in development"
run = "cd cli && cargo run"

[tasks.dev-web]
description = "Run Web in development"
run = "cd web && pnpm dev"

[tasks.build-cli]
description = "Build CLI release"
run = "cd cli && cargo build --release"

[tasks.build-web]
description = "Build Web for production"
run = "cd web && pnpm build"

[tasks.test]
description = "Run all tests"
run = [
    "cd cli && cargo test",
    "cd web && pnpm test"
]

[tasks.release]
description = "Build release for all platforms"
run = """
cd cli && cargo build --release --target x86_64-apple-darwin
cd cli && cargo build --release --target aarch64-apple-darwin
cd cli && cargo build --release --target x86_64-unknown-linux-gnu
"""
```

### CLI版

| カテゴリ | 技術 | 理由 |
|---------|------|------|
| 言語 | Rust | 軽量・シングルバイナリ配布 |
| TUI | ratatui + crossterm | Rust標準のTUIライブラリ |
| 設定 | TOML (serde) | 人間が読みやすい設定形式 |
| DB | SQLite (rusqlite) | 軽量・組み込み可能 |

### Web版

| カテゴリ | 技術 | 理由 |
|---------|------|------|
| フレームワーク | React + TypeScript | 型安全・エコシステム |
| スタイリング | Tailwind CSS | ユーティリティファースト |
| 状態管理 | Zustand | 軽量・シンプル |
| アニメーション | Framer Motion | 宣言的アニメーション |
| PWA | Workbox | オフライン対応 |

### 共通インフラ（課金・同期）

| カテゴリ | 技術 | 理由 |
|---------|------|------|
| 認証 | Supabase Auth | 無料枠が大きい |
| DB | Supabase PostgreSQL | 認証と統合 |
| 課金 | Stripe | グローバル対応 |

---

## 3. UI設計（アスキーアート）

### 3.1 メイン画面（砂時計モード・タイマー動作中）

```
┌────────────────────────────────────────────────────────┐
│  ⏳ sandoro                                   v1.0.0   │
├────────────────────────────────────────────────────────┤
│                                                        │
│                      ╭─────────╮                       │
│                      │░░░░░░░░░│                       │
│                      │ ░░░░░░░ │                       │
│                      │         │                       │
│                      │         │                       │
│                      │         │                       │
│                      ╰─╲  ░  ╱─╯                       │
│                         ╲ ░ ╱                          │
│                          ╲░╱                           │
│                           ░                            │
│                          ╱ ╲                           │
│                         ╱   ╲                          │
│                      ╭─╱  ░  ╲─╮                       │
│                      │   ░░░   │                       │
│                      │  ░░░░░  │                       │
│                      │ ░░░░░░░ │                       │
│                      │░░░░░░░░░│                       │
│                      │░░░░░░░░░│                       │
│                      ╰─────────╯                       │
│                                                        │
│                        12:30                           │
│                                                        │
│                     [ WORKING ]                        │
│                                                        │
│   Session: 3/4                      Today: 2h 15m     │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [Space] Start/Pause  [r] Reset  [s] Skip  [q] Quit   │
└────────────────────────────────────────────────────────┘
```

### 3.2 メイン画面（トマトモード）

```
┌────────────────────────────────────────────────────────┐
│  🍅 sandoro                                   v1.0.0   │
├────────────────────────────────────────────────────────┤
│                                                        │
│                         ╭─╮                            │
│                        (   )                           │
│                       ╱█████╲                          │
│                      │███████│                         │
│                      │███░░██│                         │
│                      │███░░██│                         │
│                       ╲███░░╱                          │
│                         ╰─╯                            │
│                                                        │
│                        18:45                           │
│                                                        │
│                     [ WORKING ]                        │
│                                                        │
│   Session: 2/4                      Today: 1h 30m     │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [Space] Start/Pause  [r] Reset  [s] Skip  [q] Quit   │
└────────────────────────────────────────────────────────┘
```

### 3.3 メイン画面（コーヒーモード）

```
┌────────────────────────────────────────────────────────┐
│  ☕ sandoro                                   v1.0.0   │
├────────────────────────────────────────────────────────┤
│                                                        │
│                       ∿ ∿ ∿                            │
│                      ∿ ∿ ∿ ∿                           │
│                     ┌───────┐                          │
│                     │▓▓▓▓▓▓▓│                          │
│                     │▓▓▓▓▓▓▓│                          │
│                     │▓▓░░░▓▓│                          │
│                     │░░░░░░░│                          │
│                     └───┬───┘                          │
│                         │  ╭╮                          │
│                         ╰──╯╯                          │
│                     ▔▔▔▔▔▔▔▔▔▔▔                        │
│                                                        │
│                        20:15                           │
│                                                        │
│                     [ WORKING ]                        │
│                                                        │
│   Session: 1/4                      Today: 0h 45m     │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [Space] Start/Pause  [r] Reset  [s] Skip  [q] Quit   │
└────────────────────────────────────────────────────────┘
```

### 3.4 メイン画面（ターゲットモード）

```
┌────────────────────────────────────────────────────────┐
│  🎯 sandoro                                   v1.0.0   │
├────────────────────────────────────────────────────────┤
│                                                        │
│                    ╭───────────╮                       │
│                    │ ╭───────╮ │                       │
│                    │ │ ╭───╮ │ │                       │
│                    │ │ │ ● │ │ │                       │
│                    │ │ ╰───╯ │ │                       │
│                    │ ╰───────╯ │                       │
│                    ╰───────────╯                       │
│                                                        │
│                        15:00                           │
│                                                        │
│                     [ WORKING ]                        │
│                                                        │
│   Session: 4/4                      Today: 3h 00m     │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [Space] Start/Pause  [r] Reset  [s] Skip  [q] Quit   │
└────────────────────────────────────────────────────────┘
```

### 3.5 メイン画面（炎モード）

```
┌────────────────────────────────────────────────────────┐
│  🔥 sandoro                                   v1.0.0   │
├────────────────────────────────────────────────────────┤
│                                                        │
│                          ╱╲                            │
│                         ╱  ╲                           │
│                        ╱ ╱╲ ╲                          │
│                       ╱ ╱  ╲ ╲                         │
│                      ╱ ╱ ╱╲ ╲ ╲                        │
│                     │ ╱ ╱  ╲ ╲ │                       │
│                     │╱ ╱    ╲ ╲│                       │
│                      ╲╱      ╲╱                        │
│                     ▔▔▔▔▔▔▔▔▔▔▔▔                       │
│                                                        │
│                        22:30                           │
│                                                        │
│                     [ WORKING ]                        │
│                                                        │
│   Session: 1/4                      Today: 0h 30m     │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [Space] Start/Pause  [r] Reset  [s] Skip  [q] Quit   │
└────────────────────────────────────────────────────────┘
```

### 3.6 メイン画面（スターモード）

```
┌────────────────────────────────────────────────────────┐
│  ⭐ sandoro                                   v1.0.0   │
├────────────────────────────────────────────────────────┤
│                                                        │
│                          ★                             │
│                       ╲  │  ╱                          │
│                        ╲ │ ╱                           │
│                     ────═══════────                    │
│                        ╱ │ ╲                           │
│                       ╱  │  ╲                          │
│                          │                             │
│                                                        │
│                        10:00                           │
│                                                        │
│                     [ WORKING ]                        │
│                                                        │
│   Session: 2/4                      Today: 1h 15m     │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [Space] Start/Pause  [r] Reset  [s] Skip  [q] Quit   │
└────────────────────────────────────────────────────────┘
```

### 3.7 アイコン選択画面

```
┌────────────────────────────────────────────────────────┐
│  ⚙️  Settings > Icon                                   │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Select your timer icon:                              │
│                                                        │
│   [●] ⏳  Hourglass     (animated)                    │
│   [ ] 🍅  Tomato        (animated)                    │
│   [ ] ☕  Coffee        (animated)                    │
│   ─────────────────────────                            │
│   [ ] 🎯  Target        (animated)      [PRO]         │
│   [ ] 🔥  Fire          (animated)      [PRO]         │
│   [ ] ⭐  Star          (animated)      [PRO]         │
│   [ ] 🌙  Moon          (animated)      [PRO]         │
│   [ ] 🚀  Rocket        (animated)      [PRO]         │
│   [ ] 🌊  Wave          (animated)      [PRO]         │
│   [ ] 🎮  Game          (animated)      [PRO]         │
│   [ ] 🎵  Music         (animated)      [PRO]         │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [↑↓] Navigate  [Enter] Select  [Esc] Back            │
└────────────────────────────────────────────────────────┘
```

### 3.8 カラーテーマ選択画面

```
┌────────────────────────────────────────────────────────┐
│  ⚙️  Settings > Theme                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Select color theme:                                  │
│                                                        │
│   [●] Default        ██ White/Gray                    │
│   [ ] Nord           ██ Blue/Cyan                     │
│   [ ] Dracula        ██ Purple/Pink                   │
│   ─────────────────────────                            │
│   [ ] Solarized      ██ Yellow/Orange   [PRO]         │
│   [ ] Monokai        ██ Green/Yellow    [PRO]         │
│   [ ] Gruvbox        ██ Orange/Cream    [PRO]         │
│   [ ] Tokyo Night    ██ Blue/Purple     [PRO]         │
│   [ ] Catppuccin     ██ Pastel          [PRO]         │
│   [ ] Rose Pine      ██ Pink/Rose       [PRO]         │
│   [ ] Kanagawa       ██ Blue/White      [PRO]         │
│   [ ] Custom...                         [PRO]         │
│                                                        │
│   Preview:                                             │
│   ┌──────────────────────┐                            │
│   │      ⏳  25:00       │                            │
│   │   ████████░░░░░░░░   │                            │
│   └──────────────────────┘                            │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [↑↓] Navigate  [Enter] Select  [Esc] Back            │
└────────────────────────────────────────────────────────┘
```

### 3.9 統計画面（日次）- CLI/Web共通デザイン

```
┌────────────────────────────────────────────────────────┐
│  📊 Statistics                              [d]ay     │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Today: 2025-01-04 (Sat)                             │
│                                                        │
│   Total Focus Time:    4h 30m                         │
│   Sessions Completed:  9                               │
│   Longest Streak:      4 sessions                      │
│                                                        │
│   Hourly Distribution:                                 │
│                                                        │
│   06 ░░░░░░░░░░░░░░░░                                 │
│   09 ████████░░░░░░░░  2h                             │
│   12 ████░░░░░░░░░░░░  1h                             │
│   15 ██████░░░░░░░░░░  1h 30m                         │
│   18 ░░░░░░░░░░░░░░░░                                 │
│   21 ░░░░░░░░░░░░░░░░                                 │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [d] Day  [w] Week  [m] Month  [Esc] Back             │
└────────────────────────────────────────────────────────┘
```

### 3.10 統計画面（週次）- CLI/Web共通デザイン

```
┌────────────────────────────────────────────────────────┐
│  📊 Statistics                              [w]eek    │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Week: Dec 30 - Jan 5                                │
│                                                        │
│   Total Focus Time:    18h 45m                        │
│   Sessions Completed:  38                              │
│   Daily Average:       2h 41m                         │
│                                                        │
│   Daily Breakdown:                                     │
│                                                        │
│   Mon ████████████████████  4h 30m                    │
│   Tue ████████████░░░░░░░░  2h 45m                    │
│   Wed ██████████████░░░░░░  3h 15m                    │
│   Thu ████████░░░░░░░░░░░░  1h 45m                    │
│   Fri ██████████████████░░  4h 00m                    │
│   Sat ██████████░░░░░░░░░░  2h 30m                    │
│   Sun ░░░░░░░░░░░░░░░░░░░░  0h 00m                    │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [d] Day  [w] Week  [m] Month  [Esc] Back             │
└────────────────────────────────────────────────────────┘
```

### 3.11 統計画面（月次）- CLI/Web共通デザイン

```
┌────────────────────────────────────────────────────────┐
│  📊 Statistics                              [m]onth   │
├────────────────────────────────────────────────────────┤
│                                                        │
│   January 2025                                         │
│                                                        │
│   Total Focus Time:    42h 15m                        │
│   Sessions Completed:  85                              │
│   Daily Average:       2h 49m                         │
│   Most Productive:     Wed (avg 3h 20m)               │
│                                                        │
│   Calendar View:                                       │
│                                                        │
│   Mo Tu We Th Fr Sa Su                                │
│         1  2  3  4  5                                 │
│         █  █  ░  ▓  ░                                 │
│    6  7  8  9 10 11 12                                │
│    ░  ░  ░  ░  ░  ░  ░                                │
│                                                        │
│   Legend: ░ <1h  ▒ 1-2h  ▓ 2-3h  █ 3h+               │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [d] Day  [w] Week  [m] Month  [Esc] Back             │
└────────────────────────────────────────────────────────┘
```

### 3.12 設定画面（メイン）

```
┌────────────────────────────────────────────────────────┐
│  ⚙️  Settings                                          │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Timer                                                │
│   ├─ Work Duration        25 min                      │
│   ├─ Short Break           5 min                      │
│   ├─ Long Break           15 min                      │
│   └─ Sessions until Long   4                          │
│                                                        │
│   Appearance                                           │
│   ├─ Icon                 ⏳ Hourglass                │
│   └─ Theme                Default                      │
│                                                        │
│   Notifications                                        │
│   ├─ Sound               ✓ Enabled                    │
│   └─ Desktop Alert       ✓ Enabled                    │
│                                                        │
│   Account                                              │
│   └─ Status              Free Plan                    │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [↑↓] Navigate  [Enter] Edit  [Esc] Back              │
└────────────────────────────────────────────────────────┘
```

### 3.13 課金アップグレード画面

```
┌────────────────────────────────────────────────────────┐
│  ⭐ Upgrade to Pro                                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│   Unlock all features for ¥500/month                  │
│                                                        │
│   ✓ 10+ Animated ASCII Art Icons                      │
│   ✓ 10+ Color Themes                                  │
│   ✓ Custom Theme Creator                              │
│   ✓ Unlimited Statistics History                      │
│   ✓ Cloud Sync Across Devices                         │
│   ✓ Export Data (CSV/JSON)                            │
│   ✓ Priority Support                                  │
│                                                        │
│   ┌──────────────────────────────────────────┐        │
│   │          [ Subscribe Now ]               │        │
│   └──────────────────────────────────────────┘        │
│                                                        │
│   Already have a license key? [Enter Key]             │
│                                                        │
├────────────────────────────────────────────────────────┤
│  [Enter] Subscribe  [k] Enter Key  [Esc] Back         │
└────────────────────────────────────────────────────────┘
```

---

## 4. アスキーアートアニメーション設計

### 4.1 砂時計（Hourglass）- 10段階 + 落下アニメーション

#### Stage 0 (100%) - 開始時
```
                              ╭─────────╮
                              │░░░░░░░░░│
                              │ ░░░░░░░ │
                              │  ░░░░░  │
                              │   ░░░   │
                              │    ░    │
                              ╰─╲     ╱─╯
                                 ╲   ╱
                                  ╲░╱
                                   │
                                  ╱ ╲
                                 ╱   ╲
                              ╭─╱     ╲─╮
                              │         │
                              │         │
                              │         │
                              │         │
                              │         │
                              ╰─────────╯
```

#### Stage 5 (50%) - 中間
```
                              ╭─────────╮
                              │░░░░░░░░░│
                              │         │
                              │         │
                              │         │
                              │         │
                              ╰─╲  ░  ╱─╯
                                 ╲ ░ ╱
                                  ╲░╱
                                   ░
                                  ╱ ╲
                                 ╱   ╲
                              ╭─╱     ╲─╮
                              │    ░    │
                              │   ░░░   │
                              │  ░░░░░  │
                              │ ░░░░░░░ │
                              │░░░░░░░░░│
                              ╰─────────╯
```

#### Stage 10 (0%) - 完了
```
                              ╭─────────╮
                              │         │
                              │         │
                              │         │
                              │         │
                              │         │
                              ╰─╲     ╱─╯
                                 ╲   ╱
                                  ╲ ╱
                                   │
                                  ╱ ╲
                                 ╱   ╲
                              ╭─╱     ╲─╮
                              │    ░    │
                              │   ░░░   │
                              │  ░░░░░  │
                              │ ░░░░░░░ │
                              │░░░░░░░░░│
                              ╰─────────╯
```

#### 落下アニメーション（4フレームループ、150ms間隔）
```
Frame 1         Frame 2         Frame 3         Frame 4

    ╲ ▼  ╱         ╲ · ▼ ╱        ╲   ·  ╱        ╲ ·   ╱
     ╲▓░╱           ╲░▒╱           ╲▒▓╱            ╲▓▒╱   ← ボトルネック砂
     ╱░▓╲           ╱▒░╲           ╱▓▒╲            ╱▒▓╲
    ╱  ▼ ╲         ╱ · ▼╲         ╱  · ╲          ╱·  ╲
```

ボトルネック部分でサイクリングするグラデーション表現（▓▒░）により、
砂が詰まって流れる様子をリアルに表現。

### 4.2 トマト（Tomato）- 2つのチェリートマト

蔓から2つのトマトが吊り下がるデザイン。10段階のレベル表現（右5段階→左5段階）。

```
~~~~══════════════════~~~~
     |             |
   \ | /         \ | /
  \ \|/ /       \ \|/ /
  /::▓▓▓▓::\   /::▓▓▓▓::\
 /::▓▓▓▓▓▓::\  /::▓▓▓▓▓▓::\
 |::▓▓▓▓▓▓▓▓::| |::▓▓▓▓▓▓▓▓::|
 |::▓▓▓▓▓▓▓▓::| |::▓▓▓▓▓▓▓▓::|
 \::▓▓▓▓▓▓::/  \::▓▓▓▓▓▓::/
  \::▓▓▓▓::/   \::▓▓▓▓::/
    \::::/       \::::/
```

#### 作業中アニメーション（左右スウェイ、2フレームループ）
```
Frame 1 (左揺れ)        Frame 2 (右揺れ)

  |             |         |             |
\ | /         \ | /     \ | /         \ | /
← トマト左寄り →      ← トマト右寄り →
```

#### 休憩中アニメーション（太陽再生）
```
         \   |   /
          \  |  /
       ----[  ]----
          /  |  \
         /   |   \

~~~~══════════════════~~~~
     (トマトが続く)
```

### 4.3 コーヒー（Coffee）- 6段階 + 湯気アニメーション

大きなハンドル（4行分）を持つカップデザイン。進捗60%未満で湯気表示。

```
   ～  ～
  ～    ～
   ～～
 ╭────────╮
 │▓▓▓▓▓▓▓▓├─╮
 │▓▓▓▓▓▓▓▓│ │
 │▒▒▒▒▒▒▒▒│ │
 │▒▒▒▒▒▒▒▒├─╯
 │░░░░░░░░│
 │~~~~~~~~│
 ╰────────╯
   ══════
 ▔▔▔▔▔▔▔▔▔▔▔▔
```

#### 湯気アニメーション（4フレームループ、上昇表現）
```
Frame 1         Frame 2         Frame 3         Frame 4

                 ～  ～         ～    ～          ～～
  ～  ～         ～    ～          ～～            ~~
 ～    ～          ～～            ~~
```

#### 休憩中アニメーション（注ぎ込み）
```
    │││
    ╲│╱
     ▼
 ╭────────╮
 │...     │
```

### 4.4 ターゲット（Target）- 5段階（中心に収束）

```
  100%              75%               50%               25%               0%

╭───────────╮   ╭───────────╮    ╭───────────╮    ╭───────────╮    ╭───────────╮
│ ╭───────╮ │   │ ╭───────╮ │    │ ╭───────╮ │    │           │    │           │
│ │ ╭───╮ │ │   │ │ ╭───╮ │ │    │ │       │ │    │   ╭───╮   │    │           │
│ │ │ ● │ │ │   │ │ │ ● │ │ │    │ │   ●   │ │    │   │ ● │   │    │     ●     │
│ │ ╰───╯ │ │   │ │ ╰───╯ │ │    │ │       │ │    │   ╰───╯   │    │           │
│ ╰───────╯ │   │ ╰───────╯ │    │ ╰───────╯ │    │           │    │           │
╰───────────╯   ╰───────────╯    ╰───────────╯    ╰───────────╯    ╰───────────╯
```

### 4.5 炎（Fire）- 5段階 + 揺れアニメーション

```
  100%              75%               50%               25%               0%

       ╱╲                ╱╲               ╱╲
      ╱  ╲              ╱  ╲             ╱  ╲              ╱╲
     ╱ ╱╲ ╲            ╱ ╱╲ ╲           ╱    ╲            ╱  ╲             ╱╲
    ╱ ╱  ╲ ╲          ╱ ╱  ╲ ╲         ╱  ╱╲  ╲          ╱    ╲           ╱  ╲
   ╱ ╱ ╱╲ ╲ ╲        ╱ ╱    ╲ ╲       ╱  ╱  ╲  ╲        ╱  ╱╲  ╲         ╱    ╲
  │ ╱ ╱  ╲ ╲ │      │ ╱  ╱╲  ╲ │     │  ╱    ╲  │      │  ╱  ╲  │       │  ╱╲  │
  │╱ ╱    ╲ ╲│      │╱  ╱  ╲  ╲│     │ ╱      ╲ │      │ ╱    ╲ │       │ ╱  ╲ │
   ╲╱      ╲╱        ╲ ╱    ╲ ╱       ╲╱        ╲       ╲╱      ╲        ╲╱    ╲
  ▔▔▔▔▔▔▔▔▔▔▔▔      ▔▔▔▔▔▔▔▔▔▔▔▔     ▔▔▔▔▔▔▔▔▔▔▔▔     ▔▔▔▔▔▔▔▔▔▔      ▔▔▔▔▔▔▔▔▔▔
```

#### 炎揺れアニメーション（3フレームループ）
```
  Frame 1        Frame 2        Frame 3
  
     ╱╲            ╲╱╲            ╱╲╱
    ╱╲╱╲           ╲╱╲╱          ╱╲╱╲
   ╱╲╱╲╱╲          ╱╲╱╲╱        ╲╱╲╱╲╱
```

### 4.6 スター（Star）- 5段階 + 点滅アニメーション

```
  100%              75%               50%               25%               0%

       ★                 ★                 ★                 ☆                 ☆
    ╲  │  ╱           ╲  │  ╱           ╲     ╱              │              
     ╲ │ ╱             ╲ │ ╱             ╲   ╱               │              
  ────═══════────   ────═════────     ────═══────       ────═──        ────☆────
     ╱ │ ╲             ╱ │ ╲             ╱   ╲               │              
    ╱  │  ╲           ╱  │  ╲           ╱     ╲              │              
       │                 │
```

#### 光アニメーション（2フレームループ）
```
  Frame 1        Frame 2
  
     ✦              ✧
    ╲│╱            ╲│╱
  ──═════──      ──═════──
    ╱│╲            ╱│╲
     │              │
```

### 4.7 実装データ構造

```rust
/// アイコンの種類
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum IconType {
    Hourglass,  // Free
    Tomato,     // Free
    Coffee,     // Free
    Target,     // Pro
    Fire,       // Pro
    Star,       // Pro
    Moon,       // Pro
    Rocket,     // Pro
    Wave,       // Pro
    Game,       // Pro
    Music,      // Pro
}

impl IconType {
    pub fn is_pro(&self) -> bool {
        matches!(self, 
            IconType::Target | IconType::Fire | IconType::Star |
            IconType::Moon | IconType::Rocket | IconType::Wave |
            IconType::Game | IconType::Music
        )
    }
    
    pub fn has_animation(&self) -> bool {
        true // すべてのアイコンがアニメーション対応
    }
}

/// アイコンの描画状態
pub struct IconState {
    pub icon_type: IconType,
    pub percent: f32,           // 0.0 - 100.0
    pub animation_frame: u8,    // アニメーションフレーム
    pub is_animating: bool,     // タイマー動作中か
}

impl IconState {
    /// パーセンテージから描画用の文字列配列を生成
    pub fn render(&self) -> Vec<String> {
        match self.icon_type {
            IconType::Hourglass => render_hourglass(self.percent, self.animation_frame),
            IconType::Tomato => render_tomato(self.percent),
            IconType::Coffee => render_coffee(self.percent, self.animation_frame),
            IconType::Target => render_target(self.percent),
            IconType::Fire => render_fire(self.percent, self.animation_frame),
            IconType::Star => render_star(self.percent, self.animation_frame),
            // ... 他のアイコン
        }
    }
    
    /// アニメーションを次のフレームに進める
    pub fn advance_animation(&mut self) {
        if self.is_animating {
            let max_frames = match self.icon_type {
                IconType::Hourglass => 4,
                IconType::Coffee => 4,
                IconType::Fire => 3,
                IconType::Star => 2,
                _ => 1,
            };
            self.animation_frame = (self.animation_frame + 1) % max_frames;
        }
    }
}
```

---

## 5. 課金要素設計

### 5.1 フリーミアムモデル

| カテゴリ | Free | Pro (¥500/月) |
|---------|------|---------------|
| **タイマー機能** |||
| 基本タイマー | ✅ | ✅ |
| カスタム時間設定 | 3プリセットのみ | 自由設定 |
| **アスキーアート（課金の目玉）** |||
| 基本アイコン | ⏳🍅☕ (3種) | ✅ |
| Proアイコン | ❌ | 🎯🔥⭐🌙🚀🌊🎮🎵 (8種+) |
| アニメーション | 基本アイコンのみ | 全アイコン |
| **テーマ（課金の目玉）** |||
| 基本テーマ | default/nord/dracula (3種) | ✅ |
| Proテーマ | ❌ | solarized/monokai/gruvbox/tokyo-night/catppuccin/rose-pine/kanagawa (7種+) |
| カスタムテーマ作成 | ❌ | ✅ |
| **統計** |||
| 統計閲覧 | 7日間 | 無制限 |
| エクスポート (CSV/JSON) | ❌ | ✅ |
| **同期** |||
| クラウド同期 | ❌ | ✅ |
| CLI/Web間データ共有 | ❌ | ✅ |
| 複数デバイス | ❌ | ✅ |

### 5.2 課金のフック（ユーザーが欲しくなるポイント）

1. **アスキーアート** 🎨
   - 視覚的に「かわいい！欲しい！」となりやすい
   - SNS映えする（スクショ共有）
   - 開発者のこだわりポイント

2. **テーマ** 🎭
   - 開発者は好みのテーマにこだわる
   - エディタと合わせたい需要
   - カスタムテーマで自分だけの環境

3. **統計履歴** 📊
   - 長期利用者は過去データを見たい
   - 振り返りでモチベーション維持
   - エクスポートで他ツール連携

4. **同期** 🔄
   - CLI/Web両方使う人には必須
   - 複数PCで作業する人向け
   - データ消失の心配なし

### 5.3 Web版課金フロー

```
1. ユーザーが「Upgrade to Pro」をクリック
2. Supabase Authでログイン/サインアップ
3. Stripeチェックアウトにリダイレクト
4. 支払い完了 → Webhook受信
5. Supabaseのユーザーメタデータを更新
6. アプリに戻り、Pro機能がアンロック
```

### 5.4 CLI版課金フロー

```
1. Webでサブスクリプション購入
2. ダッシュボードでライセンスキー生成
3. CLIで `sandoro license <KEY>` を実行
4. ~/.sandoro/license.key に保存（暗号化）
5. 起動時にキー検証（オフライン対応）
6. 定期的にオンライン検証（30日ごと）
```

### 5.5 ライセンスキー仕様

```
形式: SAND-XXXX-XXXX-XXXX-XXXX
検証: HMAC-SHA256 署名
有効期限: サブスクリプション継続中は無期限
オフライン猶予: 最終検証から30日間
```

---

## 6. データ設計

### 6.1 ディレクトリ構造

```
~/.sandoro/
├── config.toml          # 設定ファイル
├── data.db              # SQLite（統計データ）
├── license.key          # Proライセンス（暗号化）
└── themes/              # カスタムテーマ
    └── my-theme.toml
```

### 6.2 設定ファイル（config.toml）

```toml
[timer]
work_duration = 25          # 作業時間（分）
short_break = 5             # 短い休憩（分）
long_break = 15             # 長い休憩（分）
sessions_until_long = 4     # 長い休憩までのセッション数

[appearance]
icon = "hourglass"          # hourglass, tomato, coffee, target, fire, star, etc.
theme = "default"           # default, nord, dracula, etc.

[notifications]
sound = true                # サウンド通知
desktop = true              # デスクトップ通知

[account]
license_key = ""            # Proライセンスキー（暗号化済み）
```

### 6.3 SQLiteスキーマ

```sql
-- セッション記録テーブル
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at DATETIME NOT NULL,
    ended_at DATETIME,
    duration_seconds INTEGER,
    type TEXT NOT NULL CHECK (type IN ('work', 'short_break', 'long_break')),
    completed BOOLEAN DEFAULT FALSE
);

-- 日次統計テーブル（集計キャッシュ）
CREATE TABLE daily_stats (
    date DATE PRIMARY KEY,
    total_work_seconds INTEGER DEFAULT 0,
    sessions_completed INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0
);

-- インデックス
CREATE INDEX idx_sessions_started ON sessions(started_at);
CREATE INDEX idx_sessions_type ON sessions(type);
CREATE INDEX idx_sessions_date ON sessions(date(started_at));
```

### 6.4 CLI/Web間のデータ共有

CLI版とWeb版で同じ統計データを見るための設計：

#### ローカルのみ（Free版）
- CLI: `~/.sandoro/data.db` に保存
- Web: IndexedDB に保存
- 同期なし（別々のデータ）

#### クラウド同期（Pro版）
- Supabase PostgreSQL にデータを同期
- CLI/Webどちらからでも同じデータにアクセス
- オフライン時はローカルに保存、オンライン時に同期

```sql
-- Supabase用スキーマ（Pro版）
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    type TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSポリシー
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own sessions"
    ON user_sessions FOR ALL
    USING (auth.uid() = user_id);
```

---

## 7. 導入方法

### 7.1 CLI版の配布方法

| 方法 | OS | コマンド |
|------|-----|---------|
| **Homebrew** | macOS/Linux | `brew install sandoro` |
| **Cargo** | 全OS | `cargo install sandoro` |
| **Scoop** | Windows | `scoop install sandoro` |
| **直接DL** | 全OS | GitHub Releasesからバイナリ |
| **AUR** | Arch Linux | `yay -S sandoro` |
| **Nix** | NixOS | `nix-env -iA nixpkgs.sandoro` |

### 7.2 Homebrew Formula

```ruby
# homebrew/sandoro.rb
class Sandoro < Formula
  desc "Terminal-first Pomodoro timer with ASCII art animations"
  homepage "https://sandoro.app"
  version "1.0.0"
  license "MIT"
  
  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/USERNAME/sandoro/releases/download/v1.0.0/sandoro-darwin-arm64.tar.gz"
      sha256 "..."
    else
      url "https://github.com/USERNAME/sandoro/releases/download/v1.0.0/sandoro-darwin-amd64.tar.gz"
      sha256 "..."
    end
  end
  
  on_linux do
    if Hardware::CPU.arm?
      url "https://github.com/USERNAME/sandoro/releases/download/v1.0.0/sandoro-linux-arm64.tar.gz"
      sha256 "..."
    else
      url "https://github.com/USERNAME/sandoro/releases/download/v1.0.0/sandoro-linux-amd64.tar.gz"
      sha256 "..."
    end
  end

  def install
    bin.install "sandoro"
    
    # Shell completions
    generate_completions_from_executable(bin/"sandoro", "completions")
  end

  test do
    assert_match "sandoro #{version}", shell_output("#{bin}/sandoro --version")
  end
end
```

### 7.3 GitHub Releases 自動化

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-latest
            target: x86_64-apple-darwin
            artifact: sandoro-darwin-amd64
          - os: macos-latest
            target: aarch64-apple-darwin
            artifact: sandoro-darwin-arm64
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            artifact: sandoro-linux-amd64
          - os: ubuntu-latest
            target: aarch64-unknown-linux-gnu
            artifact: sandoro-linux-arm64
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            artifact: sandoro-windows-amd64

    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Rust
        uses: dtolnay/rust-action@stable
        with:
          targets: ${{ matrix.target }}
      
      - name: Build
        run: |
          cd cli
          cargo build --release --target ${{ matrix.target }}
      
      - name: Package
        run: |
          tar -czvf ${{ matrix.artifact }}.tar.gz -C cli/target/${{ matrix.target }}/release sandoro
      
      - name: Upload Release Asset
        uses: softprops/action-gh-release@v1
        with:
          files: ${{ matrix.artifact }}.tar.gz
```

### 7.4 Web版の導入方法

#### ブラウザで直接使用
```
1. https://sandoro.app にアクセス
2. すぐに使い始められる（インストール不要）
```

#### PWAとしてインストール
```
1. https://sandoro.app にアクセス
2. ブラウザのアドレスバーにある「インストール」アイコンをクリック
   - Chrome: 右端の ⊕ アイコン
   - Safari: 共有メニュー → ホーム画面に追加
   - Edge: ... メニュー → アプリ → インストール
3. デスクトップ/ホーム画面にアプリとして追加される
4. オフラインでも動作
```

### 7.5 CLIとWeb版の連携（Pro版）

```bash
# 1. Web版でアカウント作成 & Pro登録

# 2. CLIでログイン
$ sandoro login
Opening browser for authentication...
✓ Successfully logged in as user@example.com

# 3. 自動的に設定・統計が同期される
$ sandoro sync
✓ Synced 42 sessions from cloud
✓ Settings synchronized

# 4. ライセンスキーでの認証（オフライン環境向け）
$ sandoro license SAND-XXXX-XXXX-XXXX-XXXX
✓ License activated
✓ Pro features unlocked
```

### 7.6 インストールドキュメント（README用）

```markdown
# Installation

## 🖥️ CLI

### macOS / Linux (Homebrew) - Recommended
```bash
brew tap USERNAME/sandoro
brew install sandoro
```

### Rust (Cargo)
```bash
cargo install sandoro
```

### Windows (Scoop)
```powershell
scoop bucket add extras
scoop install sandoro
```

### Direct Download
Download the latest binary from [GitHub Releases](https://github.com/USERNAME/sandoro/releases)

## 🌐 Web

### Use in Browser
Visit [sandoro.app](https://sandoro.app) - no installation required!

### Install as PWA
1. Visit [sandoro.app](https://sandoro.app)
2. Click the install icon in your browser's address bar
3. The app will be added to your desktop/home screen

## 🔄 Sync CLI & Web (Pro)

1. Create an account at [sandoro.app](https://sandoro.app)
2. Subscribe to Pro
3. Run `sandoro login` in your terminal
4. Your settings and stats will sync automatically!
```

---

## 8. ファイル構成

### 8.1 CLI版（Rust）

```
cli/
├── Cargo.toml
├── src/
│   ├── main.rs              # エントリーポイント
│   ├── app.rs               # アプリケーション状態管理
│   ├── timer.rs             # タイマーロジック
│   ├── ui/
│   │   ├── mod.rs
│   │   ├── main_screen.rs   # メイン画面
│   │   ├── stats_screen.rs  # 統計画面
│   │   ├── settings_screen.rs
│   │   └── widgets.rs       # 共通ウィジェット
│   ├── icons/
│   │   ├── mod.rs
│   │   ├── hourglass.rs     # 砂時計描画
│   │   ├── tomato.rs        # トマト描画
│   │   ├── coffee.rs        # コーヒー描画
│   │   ├── target.rs        # ターゲット描画
│   │   ├── fire.rs          # 炎描画
│   │   └── star.rs          # スター描画
│   ├── config.rs            # 設定管理
│   ├── db.rs                # SQLite操作
│   ├── theme.rs             # テーマ定義
│   ├── license.rs           # ライセンス検証
│   └── sync.rs              # クラウド同期（Pro）
├── tests/
│   └── ...
└── completions/             # シェル補完
    ├── sandoro.bash
    ├── sandoro.zsh
    └── sandoro.fish
```

### 8.2 Web版（React）

```
web/
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── public/
│   ├── manifest.json        # PWA設定
│   ├── sw.js               # Service Worker
│   └── icons/              # PWAアイコン
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Timer/
│   │   │   ├── Timer.tsx
│   │   │   ├── AsciiIcon.tsx    # アスキーアート表示
│   │   │   └── ProgressBar.tsx
│   │   ├── Icons/               # 各アイコンコンポーネント
│   │   │   ├── Hourglass.tsx
│   │   │   ├── Tomato.tsx
│   │   │   ├── Coffee.tsx
│   │   │   ├── Target.tsx
│   │   │   ├── Fire.tsx
│   │   │   └── Star.tsx
│   │   ├── Stats/
│   │   │   ├── DailyStats.tsx
│   │   │   ├── WeeklyStats.tsx
│   │   │   └── MonthlyStats.tsx
│   │   ├── Settings/
│   │   │   ├── Settings.tsx
│   │   │   ├── IconSelector.tsx
│   │   │   └── ThemeSelector.tsx
│   │   └── common/
│   │       └── ...
│   ├── hooks/
│   │   ├── useTimer.ts
│   │   ├── useStats.ts
│   │   ├── useTheme.ts
│   │   └── useSync.ts          # クラウド同期
│   ├── stores/
│   │   ├── timerStore.ts
│   │   ├── settingsStore.ts
│   │   └── authStore.ts        # 認証状態
│   ├── utils/
│   │   ├── icons.ts            # アイコンロジック（CLI版と同等）
│   │   └── db.ts               # IndexedDB操作
│   ├── lib/
│   │   ├── supabase.ts         # Supabase クライアント
│   │   └── stripe.ts           # Stripe連携
│   └── styles/
│       └── themes.css
└── tests/
    └── ...
```

---

## 9. 実装フェーズ（タスク分割）

### Phase 1: CLI版 MVP（2週間）

#### Week 1: 基本機能

| タスク | 詳細 | 優先度 |
|--------|------|--------|
| プロジェクト初期化 | Cargo.toml、mise設定 | P0 |
| 基本TUI構造 | ratatui + crossterm セットアップ | P0 |
| タイマーロジック | カウントダウン、状態遷移 | P0 |
| 砂時計アイコン | 10段階 + 落下アニメーション | P0 |
| トマトアイコン | 5段階アニメーション | P1 |
| コーヒーアイコン | 5段階 + 湯気アニメーション | P1 |

#### Week 2: 設定・統計

| タスク | 詳細 | 優先度 |
|--------|------|--------|
| 設定ファイル | config.toml 読み書き | P0 |
| SQLite初期化 | DB作成、マイグレーション | P0 |
| セッション記録 | 開始・終了時にDB書き込み | P0 |
| 統計画面（日次） | 日次統計の表示 | P1 |
| 統計画面（週次/月次） | 週次・月次統計の表示 | P2 |
| テーマ切り替え | 3種のプリセットテーマ | P1 |

### Phase 2: Web版 MVP（2週間）

#### Week 3: 基本機能

| タスク | 詳細 | 優先度 |
|--------|------|--------|
| プロジェクト初期化 | Vite + React + TypeScript | P0 |
| タイマーコンポーネント | useTimerフック実装 | P0 |
| アスキーアートコンポーネント | 等幅フォントで表示 | P0 |
| アニメーション | requestAnimationFrameで実装 | P1 |
| IndexedDB | ローカルストレージ実装 | P0 |
| レスポンシブUI | モバイル対応 | P1 |

#### Week 4: PWA・同期基盤

| タスク | 詳細 | 優先度 |
|--------|------|--------|
| PWA設定 | manifest.json、Service Worker | P1 |
| 統計画面 | 日次/週次/月次（CLI共通デザイン） | P1 |
| 設定画面 | テーマ・アイコン選択 | P1 |
| 通知 | Web Notifications API | P2 |
| サウンド | 完了時のサウンド再生 | P2 |

### Phase 3: 課金機能（2週間）

#### Week 5: インフラ構築

| タスク | 詳細 | 優先度 |
|--------|------|--------|
| Supabase設定 | プロジェクト作成、スキーマ定義 | P0 |
| 認証実装 | Supabase Auth連携 | P0 |
| Stripe連携 | サブスクリプション設定 | P0 |
| ライセンスキー生成 | CLI用ライセンスシステム | P1 |

#### Week 6: Pro機能実装

| タスク | 詳細 | 優先度 |
|--------|------|--------|
| Pro判定ロジック | ライセンス検証 | P0 |
| Proアイコン追加 | Target, Fire, Star等 | P1 |
| Proテーマ追加 | Solarized, Monokai等 | P1 |
| クラウド同期 | CLI/Web間のデータ同期 | P2 |
| データエクスポート | CSV/JSON出力 | P2 |

### Phase 4: 配布・継続改善

#### Week 7: 配布準備

| タスク | 詳細 | 優先度 |
|--------|------|--------|
| Homebrew Formula | Tap作成、Formula定義 | P0 |
| GitHub Actions | リリース自動化 | P0 |
| crates.io公開 | cargo install対応 | P1 |
| ドキュメント | README、インストールガイド | P1 |

#### 継続改善

| タスク | 詳細 | 優先度 |
|--------|------|--------|
| カスタムテーマ作成機能 | Pro限定 | P2 |
| 追加アイコン | Moon, Rocket, Wave等 | P2 |
| API連携 | Notion、Slack等 | P3 |
| 多言語対応 | i18n | P3 |

---

## 10. 収益シミュレーション

### 保守的シナリオ

```
月次目標:
- MAU: 1,000人
- 課金率: 5%
- 課金ユーザー: 50人
- 月額収益: 50 × ¥500 = ¥25,000

年間収益: ¥300,000
```

### 成長シナリオ

```
1年後目標:
- MAU: 10,000人
- 課金率: 5%
- 課金ユーザー: 500人
- 月額収益: 500 × ¥500 = ¥250,000

年間収益: ¥3,000,000
```

---

## 11. 次のステップ

このドキュメントをClaude Codeに渡して、Phase 1のCLI版MVPから実装を開始する。

### 推奨する実装順序

1. **mise設定とプロジェクト初期化**
   - `.mise.toml` 作成
   - モノレポ構造のセットアップ
   - `cli/Cargo.toml` 作成

2. **基本的なTUI構造の構築**
   - ratatui + crossterm のセットアップ
   - メイン画面のレイアウト

3. **タイマーロジックの実装**
   - カウントダウン機能
   - 状態遷移（作業→休憩→作業...）

4. **砂時計アスキーアートの実装**
   - 10段階のフレーム
   - 落下アニメーション

5. **他アイコンの実装**
   - トマト、コーヒー（Free版）
   - 構造化されたアイコンシステム

6. **設定・DB機能の追加**
   - config.toml の読み書き
   - SQLite でセッション記録

7. **統計画面の実装**
   - 日次/週次/月次表示

---

## 12. 計測戦略

### 12.1 計測すべき指標

#### ユーザー獲得・成長

| 指標 | 説明 | 目標値（初期） |
|------|------|---------------|
| DAU (Daily Active Users) | 日次アクティブユーザー | 100+ |
| MAU (Monthly Active Users) | 月次アクティブユーザー | 1,000+ |
| 新規ユーザー数 | 日次/週次の新規登録 | 50+/週 |
| インストール数 | Homebrew/cargo install | 追跡 |

#### エンゲージメント

| 指標 | 説明 | 重要度 |
|------|------|--------|
| セッション数/ユーザー | 1日あたりの平均ポモドーロ数 | 高 |
| 継続率 (Day 1/7/30) | N日後にまだ使っているか | 高 |
| Streak分布 | 連続利用日数の分布 | 中 |
| 平均セッション時間 | タイマーの実際の利用時間 | 中 |

#### 課金・収益

| 指標 | 説明 | 目標値 |
|------|------|--------|
| 課金率 (Conversion Rate) | Free → Pro の転換率 | 5%+ |
| MRR (Monthly Recurring Revenue) | 月次経常収益 | ¥25,000+ |
| チャーン率 | 月次の解約率 | <5% |
| LTV (Lifetime Value) | ユーザー生涯価値 | ¥6,000+ |

#### 機能利用

| 指標 | 説明 | 用途 |
|------|------|------|
| アイコン人気ランキング | どのアスキーアートが使われているか | Pro機能の価値検証 |
| テーマ人気ランキング | どのテーマが選ばれているか | Pro機能の価値検証 |
| ダッシュボード利用率 | 天気/カレンダー等の利用率 | 機能の優先度判断 |
| CLI vs Web 比率 | どちらが多く使われているか | 開発リソース配分 |

### 12.2 計測ツール構成

```
┌─────────────────────────────────────────────────────────────┐
│                        計測アーキテクチャ                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   CLI版 ────┐                                               │
│             │                                               │
│             ├──→ Supabase ──→ カスタムダッシュボード        │
│             │    (イベントログ)   (Metabase or Grafana)     │
│   Web版 ────┤                                               │
│             │                                               │
│             └──→ PostHog ──→ 詳細な行動分析                 │
│                  (Web版のみ)    ファネル分析、ヒートマップ   │
│                                                             │
│   Stripe ──────→ Stripe Dashboard ──→ 課金分析             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### ツール選定

| ツール | 用途 | 価格 | 選定理由 |
|--------|------|------|----------|
| **Supabase** | イベントログDB | 無料枠内 | 既に使用、追加コストなし |
| **PostHog** | Web行動分析 | 無料（月100万イベント） | 無料枠大きい、OSS |
| **Stripe Dashboard** | 課金分析 | 無料 | Stripe標準機能 |
| **Metabase** | カスタムダッシュボード | 無料（セルフホスト） | SQL直接書ける |

### 12.3 イベント設計

#### CLI版イベント

```rust
// 送信するイベント例
enum AnalyticsEvent {
    AppStarted { version: String, os: String },
    SessionStarted { session_type: String, duration: u32 },
    SessionCompleted { session_type: String, actual_duration: u32 },
    SessionSkipped { session_type: String, remaining: u32 },
    IconChanged { icon: String, is_pro: bool },
    ThemeChanged { theme: String, is_pro: bool },
    ProUpgradeClicked,
    ProActivated,
}
```

#### Supabaseスキーマ

```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,                    -- 匿名ID（ログインしてない場合も追跡）
    event_name TEXT NOT NULL,
    event_properties JSONB,
    platform TEXT NOT NULL,          -- 'cli' or 'web'
    app_version TEXT,
    os TEXT,
    country TEXT,                    -- IPから推定（オプション）
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_user ON analytics_events(user_id);
CREATE INDEX idx_events_name ON analytics_events(event_name);
CREATE INDEX idx_events_created ON analytics_events(created_at);
```

### 12.4 プライバシー配慮

#### 原則

1. **個人を特定する情報は収集しない**
2. **オプトアウトを簡単に**
3. **収集内容を明示**

#### CLI版: 初回起動時の確認

```
┌────────────────────────────────────────────────────────────┐
│  Welcome to sandoro! 🎉                                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📊 匿名の利用統計を送信して、sandoroの改善に協力          │
│     していただけますか？                                    │
│                                                            │
│     収集する情報:                                          │
│     • セッションの開始/完了                                │
│     • 使用しているアイコン/テーマ                          │
│     • アプリのバージョン、OS                               │
│                                                            │
│     収集しない情報:                                        │
│     • 個人を特定できる情報                                 │
│     • 作業内容やメモ                                       │
│     • IPアドレス（ハッシュ化）                             │
│                                                            │
│     [y] はい、協力する                                     │
│     [n] いいえ、送信しない                                 │
│     [?] 詳細を見る                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 設定ファイル

```toml
# ~/.sandoro/config.toml
[privacy]
telemetry = true       # false に変更でオプトアウト
anonymous_id = "uuid"  # 匿名識別子（自動生成）
```

#### オプトアウトコマンド

```bash
# テレメトリを無効化
$ sandoro config set telemetry false
✓ Telemetry disabled. Thank you for trying sandoro!

# 状態確認
$ sandoro config get telemetry
telemetry = false
```

### 12.5 ダッシュボード設計

#### Metabaseで作成するダッシュボード

```
┌─────────────────────────────────────────────────────────────┐
│  sandoro Analytics Dashboard                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ DAU         │ │ MAU         │ │ MRR         │           │
│  │    142      │ │   1,847     │ │  ¥32,500    │           │
│  │   ↑ 12%     │ │   ↑ 8%      │ │   ↑ 15%     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Daily Active Users (30 days)                        │   │
│  │  ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃▄▅▆▇█▇▆▅▄▃▂▁                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────┐ ┌──────────────────────┐         │
│  │ Icon Popularity      │ │ Platform Split       │         │
│  │ 1. ⏳ Hourglass 45%  │ │ CLI: 62%            │         │
│  │ 2. 🍅 Tomato    28%  │ │ Web: 38%            │         │
│  │ 3. ☕ Coffee    15%  │ │                      │         │
│  │ 4. 🔥 Fire      12%  │ │                      │         │
│  └──────────────────────┘ └──────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. リポジトリ・ライセンス方針

### 13.1 リポジトリ公開方針

**結論: Public（公開）**

#### 理由

| 観点 | Public のメリット |
|------|-------------------|
| **信頼性** | 課金するならコードが見えた方がユーザーは安心 |
| **コミュニティ** | バグ修正、アイコン追加などPRをもらえる |
| **マーケティング** | GitHub Stars、Trending入りで認知拡大 |
| **OSS文化** | CLIツールはOSSが主流、Privateだと不信感 |
| **SEO** | GitHubからの流入が期待できる |

#### 競合にコピーされるリスクについて

- アイデアは真似できても、**継続的な改善・コミュニティ運営**は難しい
- **先行者優位**を活かす（最初に認知を取る）
- 本当の競争力は**実行力とブランド**

### 13.2 ライセンス選定

**結論: MIT License**

#### 比較検討

| ライセンス | 特徴 | 採用理由 |
|-----------|------|----------|
| **MIT** | 最も自由、制限なし | シンプル、広く使われている |
| Apache 2.0 | 特許条項あり | 今回は不要 |
| GPLv3 | コピーレフト、派生も公開必須 | 厳しすぎる |
| AGPLv3 | SaaS提供時も公開必須 | 厳しすぎる |
| BSL | 一定期間後にOSS化 | 複雑 |

#### MIT Licenseの内容

```
MIT License

Copyright (c) 2025 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 13.3 セキュリティ管理

#### 絶対にコミットしないもの

```gitignore
# .gitignore

# 環境変数・シークレット
.env
.env.local
.env.production

# ライセンスキー関連
*.key
license.key

# Supabase
supabase/.env

# IDE
.idea/
.vscode/
*.swp
```

#### 環境変数の管理

```bash
# .env.example （これはコミットする）
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
OPENWEATHERMAP_API_KEY=your-api-key-here
```

#### GitHub Secrets（CI/CD用）

```yaml
# GitHub Actions で使用
secrets:
  - SUPABASE_URL
  - SUPABASE_SERVICE_KEY
  - STRIPE_SECRET_KEY
  - CRATES_IO_TOKEN      # cargo publish用
  - HOMEBREW_TAP_TOKEN   # Homebrew Formula更新用
```

### 13.4 リポジトリ構成

```
sandoro/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml           # テスト・ビルド
│   │   ├── release.yml      # リリース自動化
│   │   └── homebrew.yml     # Homebrew更新
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── FUNDING.yml          # GitHub Sponsors
│
├── LICENSE                  # MIT License
├── README.md
├── CONTRIBUTING.md          # 貢献ガイド
├── CODE_OF_CONDUCT.md       # 行動規範
├── CHANGELOG.md             # 変更履歴
│
├── .gitignore
├── .env.example
├── .mise.toml
│
├── cli/
├── web/
├── shared/
├── docs/
└── homebrew/
```

### 13.5 コミュニティ運営

#### CONTRIBUTING.md の内容（概要）

```markdown
# Contributing to sandoro

## How to Contribute

### Bug Reports
- Use the bug report template
- Include OS, version, steps to reproduce

### Feature Requests
- Use the feature request template
- Explain the use case

### Pull Requests
- Fork the repository
- Create a feature branch
- Write tests
- Update documentation
- Submit PR

### Adding New ASCII Art Icons
We welcome new icon contributions!
See `shared/icons/README.md` for guidelines.

### Adding New Themes
See `shared/themes/README.md` for guidelines.
```

#### GitHub Sponsors

収益化の補助として GitHub Sponsors も設定可能：

```yaml
# .github/FUNDING.yml
github: [your-username]
```

---

## 14. 競合調査・分析

### 12.1 CLI/TUI ポモドーロタイマー

| プロダクト | 言語 | アスキーアート | アニメーション | 統計 | 課金 |
|-----------|------|---------------|---------------|------|------|
| **pomodoro-tui** | Rust + ratatui | ✅ トマト | ❌ 静的 | ❌ | 無料 |
| **pomo** (Bahaaio) | Go + Bubble Tea | ✅ ASCIIフォント | ❌ 数字のみ | ❌ | 無料 |
| **pydoro** | Python | ❌ | ❌ | ❌ | 無料 |
| **pymodoro** | Python + Rich | ✅ トマト | ❌ プログレスバーのみ | ❌ | 無料 |
| **productivity-timer** | Node.js | ❌ | ❌ | ✅ | 無料 |
| **timr-tui** | Rust + ratatui | ❌ | ❌ | ❌ | 無料 |
| **Pomoglorbo** | Python | ❌ | ❌ | ❌ | 無料 |
| **arttime** | Shell | ✅ 500+アート | ⚠️ 2枚切替のみ | ❌ | 無料 |

#### 既存CLIツールの特徴

- **ほぼ全て無料**: CLIツールで課金モデルを採用しているものは見当たらない
- **アスキーアートは存在するが静的**: 時間経過で絵が変化するものはない
- **統計機能が弱い**: 記録・可視化まで対応しているものは少ない
- **Web連携なし**: CLI単体で完結している

### 12.2 Web/アプリ版ポモドーロタイマー

| プロダクト | 価格 | 特徴 | 月間収益（推定） |
|-----------|------|------|-----------------|
| **Pomofocus** | 無料 / $1.99 | シンプル、人気No.1 | - |
| **Session** | $5/月 | macOS/iOS、統計充実 | $5,000+ |
| **Flow** | $1.49/月 | Apple向け、ミニマル | - |
| **Focus To-Do** | $3.99/月 or $11.99 | タスク管理統合 | - |
| **Forest** | フリーミアム | 木を育てるゲーミフィケーション | - |
| **Be Focused Pro** | $10買い切り | Apple向け | - |
| **Pomoforge** | 無料 | PWA、音楽統合 | - |

#### 成功事例: Session

- 月額$5で**$5,000+/月**の収益を達成
- 成功要因: **統計・分析機能**が決め手
- 「使い続けたくなる」仕組みが重要

### 12.3 競合の弱点（機会）

| 弱点 | 詳細 |
|------|------|
| **アニメーションがつまらない** | 既存ツールは「数字が減るだけ」「プログレスバーが伸びるだけ」 |
| **CLI/Web分断** | CLIユーザーはCLIのみ、Webユーザーはwebのみ。同期できない |
| **CLIで課金モデルがない** | 無料が当たり前。差別化できれば課金の余地あり |
| **「眺めたくなる」要素がない** | 機能的だが、愛着が湧かない |

---

## 15. 差別化戦略

### 13.1 コンセプトの進化

**従来**: 「ポモドーロタイマー」
**新コンセプト**: 「眺めていたくなる開発者向けターミナルダッシュボード with ポモドーロ」

ポモドーロタイマーは機能の一つ。メインは**「常駐させたくなるターミナル画面」**。

### 13.2 差別化ポイント

#### 🎨 1. 時間経過で「絵が変化する」アニメーション

既存ツールとの違い:

| 既存ツール | sandoro |
|-----------|---------|
| 数字がカウントダウン | 砂が上から下に落ちる |
| プログレスバーが伸びる | コーヒーの湯気が揺れる |
| 静的なアスキーアート | トマトが徐々に食べられる |

**時間の経過を「視覚的に体感」できる**

#### 🔄 2. CLI + Web 同期

- **CLI**: ターミナルで作業中に使用
- **Web**: ブラウザ・スマホで確認
- **同じデータ**: どちらからでも統計が見られる

これは既存ツールにない組み合わせ。

#### 📊 3. ダッシュボード機能

タイマーだけでなく、**開発中に欲しい情報を一画面に**:

```
┌─────────────────────────────────────────────────────────┐
│  sandoro                              Tokyo  15:42 JST  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│        ╭─────────╮                 ☀️  12°C             │
│        │░░░░░░░░░│                 Mostly Sunny         │
│        │ ░░░░░░░ │                                      │
│        │  ░░░░░  │                 ─────────────────    │
│        ╰─╲  ░  ╱─╯                                      │
│           ╲ ░ ╱                    📊 Today: 2h 15m     │
│            ╲░╱                     🔥 Streak: 5 days    │
│             ░                                           │
│            ╱ ╲                     ─────────────────    │
│           ╱   ╲                                         │
│        ╭─╱     ╲─╮                 📅 Next: Meeting     │
│        │   ░░░   │                    16:00 (in 18m)    │
│        │  ░░░░░  │                                      │
│        │ ░░░░░░░ │                 ─────────────────    │
│        ╰─────────╯                                      │
│                                                         │
│             18:45                  🎵 Spotify           │
│          [ WORKING ]                 "Lo-Fi Beats"      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Space] Pause  [s] Skip  [w] Weather  [q] Quit         │
└─────────────────────────────────────────────────────────┘
```

#### ダッシュボード要素（段階的実装）

| 要素 | Free | Pro | 実装難易度 | 価値 |
|------|------|-----|-----------|------|
| ローカル時間 | ✅ | ✅ | ⭐ | 時計として常駐できる |
| 今日の作業時間 | ✅ | ✅ | ⭐ | モチベーション維持 |
| 連続日数（Streak） | ✅ | ✅ | ⭐ | ゲーミフィケーション |
| 天気 | ❌ | ✅ | ⭐⭐ | 一目で外の様子がわかる |
| 次の予定（カレンダー） | ❌ | ✅ | ⭐⭐⭐ | Google Calendar連携 |
| Spotify再生中 | ❌ | ✅ | ⭐⭐⭐ | 作業BGMと連動 |
| GitHub今日のコミット | ❌ | ✅ | ⭐⭐ | 開発者向け |
| Slack通知数 | ❌ | ✅ | ⭐⭐⭐ | 気になる通知を確認 |

### 13.3 競合との比較まとめ

| 観点 | 既存CLIツール | 既存Webアプリ | sandoro |
|------|--------------|--------------|---------|
| プラットフォーム | CLIのみ | Webのみ | CLI + Web |
| アニメーション | 静的 or 数字のみ | なし or 単純 | 絵が変化する |
| ダッシュボード | なし | 一部あり | 天気・カレンダー等 |
| 課金モデル | なし | あり | あり |
| 統計 | 弱い | 強い | 強い（CLI/Web共通） |
| 常駐したくなるか | ❌ | ❌ | ✅ |

### 13.4 ターゲットユーザー

**メインターゲット**: ターミナルをよく使う開発者

- tmux/Wezterm等でペインを分割している
- 作業中にターミナルを常に開いている
- CLIツールに愛着がある・課金に抵抗がない
- Neovim/Vim ユーザー層と重なる

**サブターゲット**: 一般的なポモドーロユーザー（Web版）

- ブラウザで手軽に使いたい
- PWAでデスクトップアプリ的に使用

### 13.5 マーケティング戦略

#### ローンチ時

1. **Product Hunt** - CLIツールのカテゴリで投稿
2. **Hacker News** - "Show HN" で紹介
3. **Reddit** - r/commandline, r/vim, r/rust
4. **Twitter/X** - 開発者コミュニティ、ASCIIアートのGIF動画
5. **Zenn/Qiita** - 日本語で技術記事

#### 差別化メッセージ

> 「砂時計の砂が落ちるのを眺めながら、集中する25分間」
> 
> sandoro は、ただのタイマーじゃない。
> 時間の経過を「感じられる」ターミナルダッシュボード。

---

## 16. 更新された課金要素

### 14.1 改訂版フリーミアムモデル

| カテゴリ | Free | Pro (¥500/月) |
|---------|------|---------------|
| **タイマー機能** |||
| 基本タイマー | ✅ | ✅ |
| カスタム時間設定 | 3プリセットのみ | 自由設定 |
| **アスキーアート** |||
| 基本アイコン | ⏳🍅☕ (3種) | ✅ |
| Proアイコン | ❌ | 🎯🔥⭐🌙🚀🌊🎮🎵 (8種+) |
| **テーマ** |||
| 基本テーマ | 3種 | ✅ |
| Proテーマ + カスタム | ❌ | 7種+ |
| **統計** |||
| 統計閲覧 | 7日間 | 無制限 |
| エクスポート | ❌ | ✅ |
| **ダッシュボード（新機能）** |||
| ローカル時間 | ✅ | ✅ |
| 今日の作業時間・Streak | ✅ | ✅ |
| 天気表示 | ❌ | ✅ |
| カレンダー連携 | ❌ | ✅ |
| Spotify連携 | ❌ | ✅ |
| GitHub連携 | ❌ | ✅ |
| **同期** |||
| クラウド同期 | ❌ | ✅ |
| CLI/Web間データ共有 | ❌ | ✅ |

### 14.2 課金転換のフック

1. **アスキーアートの魅力** - 「あのアイコン使いたい！」
2. **ダッシュボード機能** - 「天気も見たい」「カレンダー連携便利」
3. **統計の継続性** - 「7日以上前のデータも見たい」
4. **同期の便利さ** - 「PCでもスマホでも見たい」

---

## 17. 更新された実装フェーズ

### Phase 1: CLI版 MVP ✅ 完了

- 基本TUI、タイマーロジック、4種アイコンアニメーション
- 設定画面、テーマ選択
- SQLite、セッション記録、統計（日次/週次/月次）

### Phase 1.5: 統計可視化強化 ✅ 完了

| タスク | 詳細 | ステータス |
|--------|------|----------|
| ヒートマップ（Web） | GitHub草グラフ風の活動可視化 | ✅ 完了 |
| ヒートマップ（CLI） | Unicode文字（░▒▓█）での表示 | ✅ 完了 |
| Streak表示 | 連続日数計算・表示 | ✅ 完了 |
| エクスポート（CLI） | JSON/CSV形式での出力 | ✅ 完了 |
| レインボーグラデーション | アイコン・ヒートマップの虹色表示 | ✅ 完了 |

### Phase 2: Web版 MVP ✅ 完了

- タイマー、アスキーアート、アニメーション
- localStorage セッション記録、統計画面
- 設定画面、レスポンシブUI
- ヒートマップ、Streak表示、エクスポート機能

### Phase 2.5: Webデプロイ・インフラ ✅ ほぼ完了

| タスク | 詳細 | ステータス |
|--------|------|----------|
| Vercel/Cloudflareデプロイ | sandoro.app公開 | ⏳ 待機中 |
| PWA設定 | Service Worker、オフライン対応 | ✅ 完了 |
| 通知（Web） | Web Notifications API、設定でON/OFF | ✅ 完了 |
| 通知（CLI） | デスクトップ通知、設定でON/OFF | ✅ 完了 |
| サウンド（Web） | Web Audio API、設定でON/OFF、音量調節 | ✅ 完了 |
| サウンド（CLI） | Terminal bell、設定でON/OFF | ✅ 完了 |
| アクセントカラー | 10色（cyan, purple, pink, orange, green, blue, indigo, yellow, red, rainbow） | ✅ 完了 |
| 目標設定 | 日次/週次のセッション数・作業時間目標 | ✅ 完了 |
| 期間比較 | 今週vs先週、今月vs先月の統計比較 | ✅ 完了 |

### Phase 2.7: UX強化・タグ機能

| タスク | 詳細 | ステータス |
|--------|------|----------|
| 現在時刻表示 | タイマー画面に常時表示 | ⏳ 待機中 |
| コンテキストメッセージ | 時刻・状態に応じた気の利いた一言表示 | ⏳ 待機中 |
| タグ機能（設定） | ユーザーがカスタムタグを定義できる | ⏳ 待機中 |
| タグ機能（セッション） | 作業開始時にタグを選択・記録 | ⏳ 待機中 |
| タグ別統計 | statsでタグ別の作業時間を可視化 | ⏳ 待機中 |
| 統計シェア機能 | 頑張りをSNS等で共有できる | ⏳ 待機中 |

**コンテキストメッセージ例**:
- 朝（6:00-11:00）: 「おはようございます！今日も頑張りましょう」
- 昼（11:00-14:00）: 「お昼時ですね。休憩も大切に」
- 午後（14:00-18:00）: 「午後も集中していきましょう」
- 夜（18:00-22:00）: 「こんばんは、熱心ですね」
- 深夜（22:00-6:00）: 「夜更かしお疲れ様です。無理しないで」
- 休憩中: 「リフレッシュタイム！軽くストレッチでも」
- 長い休憩: 「お疲れ様！しっかり休んでくださいね」

**タグ機能の仕様**:
- ユーザーが設定画面でタグを作成（例: 仕事、勉強、プログラミング、読書）
- セッション開始時にタグを選択（任意）
- stats画面でタグ別の作業時間を円グラフ/棒グラフで表示
- エクスポート時にもタグ情報を含める

**シェア機能の仕様**:
- 日次/週次/月次の統計サマリー画像生成
- Twitter/X、その他SNSへのシェアボタン
- OGP画像対応（Web版）

### Phase 3: CLI/Web統合

| タスク | 詳細 | ステータス |
|--------|------|----------|
| データ共有検討 | ローカルファイル共有 or クラウド同期 | ⏳ 待機中 |
| 統計統合 | CLI/Web両方のデータを一元管理 | ⏳ 待機中 |
| 同時使用対応 | 複数インスタンス時のデータ整合性 | ⏳ 待機中 |

**データ共有方式の選択肢**:
- **A案（クラウド同期）**: サーバー・認証が必要、オフライン時に制約
- **B案（ローカルファイル共有）**: ~/.sandoro/sessions.db を共有、Web版はFile System Access API使用
- **C案（Export/Import）**: 手動エクスポート・インポート

現時点では **B案（ローカルファイル共有）** を推奨。シンプルでオフライン対応可能。

### Phase 4: 課金機能・カスタマイズ

| タスク | 詳細 | ステータス |
|--------|------|----------|
| ライセンス認証 | Pro機能のアンロック | ⏳ 待機中 |
| Stripe連携 | 課金・サブスク管理 | ⏳ 待機中 |
| クラウド同期（Pro） | 複数デバイス間同期 | ⏳ 待機中 |
| カラーカスタマイズ | Free: 3プリセット、Pro: フルカスタム | ⏳ 待機中 |

**カラーカスタマイズ詳細**:
- **Free版**: 3つのプリセットカラー（Default水色、緑、オレンジ）
- **Pro版**:
  - ヒートマップカラーのフルカスタマイズ（カラーピッカー）
  - カスタムテーマ作成（背景、テキスト、アクセント色）
  - インポート/エクスポート（他ユーザーとの共有）

### Phase 5: ダッシュボード・拡張機能

| タスク | 詳細 | ステータス |
|--------|------|----------|
| サイドパネル追加 | 常駐ダッシュボード | ⏳ 待機中 |
| 天気API連携 | OpenWeatherMap等 | ⏳ 待機中 |
| Google Calendar連携 | OAuth認証 | ⏳ 待機中 |
| Spotify連携 | 再生中の曲表示 | ⏳ 待機中 |
| GitHub連携 | 今日のコミット数 | ⏳ 待機中 |

### Phase 6: 配布・マーケティング

| タスク | 詳細 | ステータス |
|--------|------|----------|
| Product Hunt準備 | アセット作成 | ⏳ 待機中 |
| デモGIF作成 | アニメーションの魅力を伝える | ⏳ 待機中 |
| ランディングページ | sandoro.app | ⏳ 待機中 |
| Homebrew Formula | brew install sandoro | ⏳ 待機中 |
| Zenn/Qiita記事 | 技術記事でPR | ⏳ 待機中 |

---

## 18. 次のステップ

### 現在の優先順位

1. **Phase 2.5**: Webデプロイ（Vercel/Cloudflare） ← 残り: デプロイのみ
2. **Phase 2.7**: UX強化・タグ機能（現在時刻、メッセージ、タグ、シェア）
3. **Phase 3**: CLI/Web統合（データ共有）
4. **Phase 4-6**: 課金、拡張機能、マーケティング

### 差別化を意識した開発

- アニメーションの品質にこだわる（砂の落下、湯気の揺れ）
- 「眺めていたくなる」UIを追求
- ヒートマップで「継続のモチベーション」を高める
- CLI/Web両対応で「どこでも使える」価値を提供
- **タグ機能で「何に時間を使ったか」を可視化**
- **気の利いたメッセージで「温かみのある体験」を提供**

---

## 19. 実装進捗

### Phase 1: CLI版 MVP ✅ 完了

#### Week 1: 基本機能 ✅ 完了

| タスク | ステータス |
|--------|----------|
| プロジェクト初期化 | ✅ 完了 |
| 基本TUI構造 | ✅ 完了 |
| タイマーロジック | ✅ 完了 |
| 砂時計アイコン（4フェーズアニメーション） | ✅ 完了 |
| トマトアイコン（揺れアニメーション、太陽演出） | ✅ 完了 |
| コーヒーアイコン（4フェーズ湯気、注ぎアニメーション） | ✅ 完了 |
| プログレスバーアイコン | ✅ 完了 |
| 作業/休憩モード視覚的演出 | ✅ 完了 |
| 動的レイアウト（アイコンサイズ対応） | ✅ 完了 |
| テーマ設定（Nord, Dracula等） | ✅ 完了 |
| 設定画面（アイコン/テーマ選択） | ✅ 完了 |

#### Week 2: 設定・統計 ✅ 完了

| タスク | ステータス |
|--------|----------|
| 設定ファイル（config.toml） | ✅ 完了 |
| SQLite初期化 | ✅ 完了 |
| セッション記録 | ✅ 完了 |
| 統計画面（日次） | ✅ 完了 |
| 統計画面（週次/月次） | ✅ 完了 |

### Phase 2: Web版 MVP ✅ ほぼ完了

#### Week 3: 基本機能 ✅ 完了

| タスク | ステータス |
|--------|----------|
| プロジェクト初期化 | ✅ 完了 |
| タイマーコンポーネント | ✅ 完了 |
| アスキーアートコンポーネント | ✅ 完了 |
| アニメーション | ✅ 完了 |
| localStorage（セッション記録） | ✅ 完了 |
| レスポンシブUI | ✅ 完了 |

#### Week 4: PWA・同期基盤 ✅ ほぼ完了

| タスク | ステータス |
|--------|----------|
| PWA設定 | ⏳ 待機中 |
| 統計画面 | ✅ 完了 |
| 設定画面 | ✅ 完了 |
| ヒートマップ（草グラフ） | ✅ 完了 |
| ストリーク表示（Web/CLI） | ✅ 完了 |
| エクスポート機能（JSON/CSV） | ✅ 完了 |
| 通知（Web/CLI） | ✅ 完了 |
| サウンド（Web/CLI） | ✅ 完了 |
| レインボーグラデーション（Web/CLI） | ✅ 完了 |

---

*Document Version: 4.5*
*Product Name: sandoro*
*Created: 2025-01-04*
*Updated: 2026-01-13*

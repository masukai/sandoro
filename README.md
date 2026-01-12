<div align="center">

# 🏜️ sandoro

**砂時計アニメーションが特徴的なポモドーロタイマー**

[![CI](https://github.com/masukai/sandoro/actions/workflows/ci.yml/badge.svg)](https://github.com/masukai/sandoro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/Rust-1.92+-orange?logo=rust)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

<br />

<img src="docs/assets/demo.gif" alt="sandoro demo" width="600">

*CLI & Web 両対応 • リッチなASCIIアートアニメーション • オフライン対応*

[Web版を試す](https://sandoro.app) · [リリース](https://github.com/masukai/sandoro/releases) · [ドキュメント](docs/)

</div>

---

## 🍅 ポモドーロ・テクニックとは？

**ポモドーロ・テクニック**は、1980年代にフランチェスコ・シリロによって考案された時間管理術です。

### 基本サイクル

```
🍅 作業 25分 → ☕ 休憩 5分 → 🍅 作業 25分 → ☕ 休憩 5分 → ...
                    ↓ 4セッション完了後
                🛋️ 長い休憩 15-30分
```

### なぜ効果的なのか？

| ポイント | 説明 |
|----------|------|
| **集中力の維持** | 25分という「短すぎず長すぎない」時間で集中力を最大化 |
| **先延ばし防止** | 「とりあえず25分だけ」と始めやすい |
| **疲労の軽減** | 定期的な休憩で脳をリフレッシュ |
| **時間の可視化** | 「今日は8ポモドーロ達成」と成果が見える |

sandoroは、このポモドーロ・テクニックを**楽しく続けられる**ようにデザインされたタイマーです。

---

## ✨ 特徴

<table>
<tr>
<td width="50%">

### 🎨 リッチなアニメーション

Unicode文字（`░▒▓`）によるグラデーション表現と4フェーズのスムーズなアニメーション

</td>
<td width="50%">

### 🖥️ CLI & Web

ターミナルでもブラウザでも同じ体験。PWA対応でオフラインでも動作

</td>
</tr>
<tr>
<td>

### 🎯 4種類のアイコン

- ⏳ **砂時計**: 砂が落下/上昇するアニメーション
- 🍅 **トマト**: 2つのチェリートマトが揺れる
- ☕ **コーヒー**: 湯気が立ち上る/注がれる
- 📊 **プログレス**: シンプルな進捗バー

</td>
<td>

### 🎨 カラーテーマ

Nord, Dracula など人気テーマに対応。お好みの配色で作業できます

</td>
</tr>
</table>

---

## 🚀 インストール

### CLI版

<details open>
<summary><strong>macOS / Linux (Homebrew)</strong></summary>

```bash
brew tap masukai/sandoro
brew install sandoro
```

</details>

<details>
<summary><strong>Rust (Cargo)</strong></summary>

```bash
cargo install sandoro
```

</details>

<details>
<summary><strong>直接ダウンロード</strong></summary>

[GitHub Releases](https://github.com/masukai/sandoro/releases) から最新のバイナリをダウンロード

| OS | Architecture | ダウンロード |
|----|--------------|-------------|
| macOS | Apple Silicon | `sandoro-darwin-arm64` |
| macOS | Intel | `sandoro-darwin-amd64` |
| Linux | x86_64 | `sandoro-linux-amd64` |

</details>

### Web版

👉 **[sandoro.app](https://sandoro.app)** にアクセス（インストール不要）

PWAとしてインストールすれば、デスクトップアプリのように使えます。

---

## 📖 使い方

### 基本操作

```bash
# タイマーを開始
sandoro

# カスタム設定で開始
sandoro start --work 30 --short-break 10 --long-break 20
```

### キーボードショートカット

| キー | 操作 |
|:----:|------|
| `Space` | 開始 / 一時停止 |
| `r` | リセット（現在のタイマーのみ） |
| `R` | フルリセット（セッション数も含む） |
| `s` | スキップ |
| `Tab` | 設定画面 |
| `q` | 終了 |

### 設定オプション

| 設定 | 説明 | デフォルト |
|------|------|-----------|
| Work Duration | 作業時間（分） | 25 |
| Short Break | 短い休憩時間（分） | 5 |
| Long Break | 長い休憩時間（分） | 15 |
| Sessions until long | 長い休憩までのセッション数 | 4 |
| Auto Start | 次のセッションを自動開始 | OFF |

### CLI コマンド一覧

```bash
sandoro [COMMAND] [OPTIONS]
```

| コマンド | 説明 |
|----------|------|
| `sandoro` | タイマーを開始（デフォルト） |
| `sandoro start` | タイマーを開始（オプション指定可能） |
| `sandoro stats` | 統計を表示 |
| `sandoro help` | ヘルプを表示 |

#### `sandoro start` オプション

```bash
sandoro start [OPTIONS]
```

| オプション | 短縮 | 説明 | デフォルト |
|------------|------|------|-----------|
| `--work <分>` | `-w` | 作業時間（分） | 25 |
| `--short-break <分>` | `-s` | 短い休憩時間（分） | 5 |
| `--long-break <分>` | `-l` | 長い休憩時間（分） | 15 |
| `--sessions <数>` | `-n` | 長い休憩までのセッション数 | 4 |
| `--icon <種類>` | `-i` | アイコン（hourglass/tomato/coffee/progress） | hourglass |
| `--theme <テーマ>` | `-t` | テーマ（default/nord/dracula/solarized/gruvbox/monokai/tokyonight） | default |
| `--auto-start` | `-a` | 次のセッションを自動開始 | OFF |

#### `sandoro stats` オプション

```bash
sandoro stats [OPTIONS]
```

| オプション | 短縮 | 説明 |
|------------|------|------|
| `--day` | `-d` | 今日の統計を表示（デフォルト） |
| `--week` | `-w` | 過去7日間の統計を表示 |
| `--month` | `-m` | 過去30日間の統計を表示 |

**使用例:**

```bash
# 今日の統計
sandoro stats

# 週間統計
sandoro stats --week

# 月間統計
sandoro stats -m
```

---

## 🛠️ 開発

### 必要なツール

- [mise](https://mise.jdx.dev/) - ツールバージョン管理

```bash
# 全ての開発ツールをインストール
mise install
```

### 開発コマンド

```bash
# CLI版
cd cli
cargo run        # 実行
cargo test       # テスト
cargo clippy     # リント

# Web版
cd web
pnpm install     # 依存関係インストール
pnpm dev         # 開発サーバー起動
pnpm test        # テスト
pnpm build       # ビルド
```

---

## 📁 プロジェクト構成

```
sandoro/
├── cli/          # 🦀 Rust CLI (ratatui)
├── web/          # ⚛️  React Web (Vite + TailwindCSS)
├── shared/       # 📦 共有リソース
└── docs/         # 📚 ドキュメント
```

---

## 📄 ライセンス

[MIT License](LICENSE) © 2025 masukai

---

<div align="center">

**[⬆ トップに戻る](#-sandoro)**

Made with ❤️ and ☕

</div>

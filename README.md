# sandoro

**砂時計アニメーションが特徴的なポモドーロタイマー**

[![CI](https://github.com/USERNAME/sandoro/actions/workflows/ci.yml/badge.svg)](https://github.com/USERNAME/sandoro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 特徴

- **リッチなアスキーアートアニメーション**: Unicode文字（░▒▓）によるグラデーション表現
- **4種類のアニメーションアイコン**:
  - 砂時計: 4フェーズの砂落下アニメーション、ボトルネック砂表現
  - トマト: 2つのチェリートマトが揺れるアニメーション
  - コーヒー: 4フェーズの湯気上昇アニメーション
  - プログレスバー: シンプルな進捗表示
- **作業/休憩モードの視覚的演出**:
  - 作業中: 砂が落下、トマトが揺れる、湯気が上昇
  - 休憩中: 砂が上昇（逆流）、太陽が輝く、コーヒーが注がれる
- **カラーテーマ**: Nord, Dracula など人気テーマに対応
- **統計機能**: 日次/週次/月次の作業記録
- **CLI & Web**: ターミナルでもブラウザでも使える
- **PWA対応**: オフラインでも動作

```
┌────────────────────────────────────────────────────────────────┐
│  sandoro                                               v0.1.0  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                        ╔══════════╗                            │
│                        ║▄▄▄▄▄▄▄▄▄▄║                            │
│                        ║░░░░░░░░░░║  ← 砂 (薄い)               │
│                        ║░░░░░░░░░░║                            │
│                        ║▒▒▒▒▒▒▒▒▒▒║  ← 砂 (中間)               │
│                        ║▒▒▒▒▒▒▒▒▒▒║                            │
│                         ╲▓▓▓▓▓▓▓▓╱   ← 砂 (濃い)               │
│                          ╲▓▓▓▓▓▓╱                              │
│                           ╲ ▒░ ╱     ← 落下する砂              │
│                            ╲  ╱                                │
│                            ╱  ╲                                │
│                           ╱ ░▒ ╲                               │
│                          ╱      ╲                              │
│                         ╱        ╲                             │
│                        ║          ║                            │
│                        ║          ║                            │
│                        ║          ║                            │
│                        ║          ║                            │
│                        ║▀▀▀▀▀▀▀▀▀▀║                            │
│                        ╚══════════╝                            │
│                                                                │
│                           12:30                                │
│                        [ WORKING ]                             │
│                                                                │
│   作業中: 砂が4フェーズで落下 ▼·  休憩中: 砂が上昇 ↑°          │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│    [Space] Start/Pause  [r] Reset  [s] Skip  [q] Quit          │
└────────────────────────────────────────────────────────────────┘
```

## インストール

### CLI版

#### macOS / Linux (Homebrew)

```bash
brew tap USERNAME/sandoro
brew install sandoro
```

#### Rust (Cargo)

```bash
cargo install sandoro
```

#### 直接ダウンロード

[GitHub Releases](https://github.com/USERNAME/sandoro/releases) から最新のバイナリをダウンロード

### Web版

[sandoro.app](https://sandoro.app) にアクセス（インストール不要）

#### PWAとしてインストール

1. [sandoro.app](https://sandoro.app) にアクセス
2. ブラウザのアドレスバーにある「インストール」アイコンをクリック
3. デスクトップ/ホーム画面にアプリとして追加される

## 使い方

### CLI

```bash
# デフォルト設定でタイマーを開始
sandoro

# カスタム設定で開始
sandoro start --work 30 --short-break 10

# 統計を表示
sandoro stats --day
sandoro stats --week
sandoro stats --month

# 設定を変更
sandoro config --icon tomato --theme nord
```

### キーボードショートカット

| キー | 操作 |
|------|------|
| `Space` | 開始/一時停止 |
| `r` | リセット |
| `s` | スキップ |
| `q` | 終了 |

## 開発

### 必要なツール

- [mise](https://mise.jdx.dev/) - ツールバージョン管理
- Rust 1.92+
- Node.js 24+
- pnpm 10+

### セットアップ

```bash
# ツールをインストール
mise install

# CLI版を開発モードで実行
mise run dev-cli

# Web版を開発モードで実行
mise run install-web
mise run dev-web
```

### テスト

```bash
# CLI版のテスト
mise run test-cli

# Web版のテスト
mise run test-web

# 全体のテスト
mise run test
```

## プロジェクト構成

```
sandoro/
├── cli/                # Rust CLI
│   ├── Cargo.toml
│   └── src/
├── web/                # React Web
│   ├── package.json
│   └── src/
├── shared/             # 共有リソース
│   ├── themes/
│   └── schema.sql
├── docs/               # ドキュメント
└── homebrew/           # Homebrew Formula
```

## Pro版

月額 ¥500 で以下の機能がアンロック:

- **10+ アスキーアートアイコン** (Target, Fire, Star, Moon, Rocket など)
- **10+ カラーテーマ** (Solarized, Monokai, Gruvbox, Tokyo Night など)
- **カスタムテーマ作成**
- **無制限の統計履歴**
- **クラウド同期** (CLI/Web間でデータ共有)
- **データエクスポート** (CSV/JSON)

## ドキュメント

- [PLAN.md](PLAN.md) - プロジェクト計画と設計書
- [RUNBOOK.md](RUNBOOK.md) - 運用ルールと手順
- [CONTRIBUTING.md](CONTRIBUTING.md) - 開発フローとレビュープロセス

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

## コントリビューション

[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

# RUNBOOK

## 1. 位置づけ
この Runbook は sandoro プロジェクトの運用と恒久ルールを定義する一次情報です。人間のコントリビュータと AI エージェントの双方が参照し、疑問があれば本書を基準に判断します。

## 2. ドキュメント体系
- `README.md`: プロジェクト概要とクイックスタート
- `PLAN.md`: 実装計画書（アーキテクチャ、費用見積もり、実装手順の詳細）
- `CONTRIBUTING.md`: 人の開発フローとレビュー手順
- `AGENTS.md` / `CLAUDE.md`: エージェント向け実務ガイド
- 本 Runbook: 恒久ルール・標準手順・チェックリスト（**本書が最優先**）

## 3. 変更管理と恒久ルール

### 恒久ルール追加のフロー
1. 新しい恒久ルールが必要か判断したら、まず関係者と合意形成を行う
2. AI も人も、恒久化前に「RUNBOOK.md に追記しますか？」と必ず確認する
3. YES の場合は Runbook を更新し、関連ドキュメントがあれば同期する
4. 変更内容は Pull Request で共有し、レビュアーが適用手順と影響範囲を確認する

### ドキュメント更新ルール
コード変更時は対応するドキュメントも同時に更新する（詳細は `AGENTS.md` の「ドキュメント更新の原則」を参照）

## 4. 環境準備

### ツールのインストール
```bash
# mise で必要なツールを一括インストール
mise install

# これにより以下がインストールされます（mise.toml を参照）:
# - Rust 1.92（CLI 開発用）
# - Node.js 24（Web 開発用）
# - pnpm 10（パッケージマネージャ）
# - Supabase CLI 2.72.7（バックエンド管理用）
# - gh 2.81.0（GitHub CLI）
```

### CLI 開発のセットアップ
```bash
# CLIディレクトリに移動
cd cli

# 依存関係のインストール & ビルド
cargo build

# 開発モードで実行
cargo run

# テスト実行
cargo test

# リリースビルド
cargo build --release
```

### Web 開発のセットアップ
```bash
# Webディレクトリに移動
cd web

# 依存関係のインストール
pnpm install

# 開発サーバー起動（http://localhost:5173）
pnpm dev

# ビルド
pnpm build

# テスト実行
pnpm test
```

### mise タスクを使った開発（推奨）
```bash
# CLI 開発
mise run dev-cli      # 開発モードで実行
mise run build-cli    # ビルド
mise run test-cli     # テスト
mise run cli-help     # ヘルプ表示

# Web 開発
mise run dev-web      # 開発サーバー起動
mise run build-web    # ビルド
mise run test-web     # テスト
mise run install-web  # 依存関係インストール

# Supabase 管理
mise run supabase:start   # ローカル Supabase 起動
mise run supabase:stop    # ローカル Supabase 停止
mise run supabase:migrate # マイグレーション適用
mise run supabase:types   # TypeScript 型生成
```

### 認証設定

**GitHub CLI を使う場合**:
```bash
# GitHub 認証
gh auth login
```

**Supabase（クラウド同期機能）**:
```bash
# Supabase CLI は mise install で自動インストール

# Supabase アクセストークンの取得（初回のみ）
# 1. https://supabase.com/dashboard/account/tokens にアクセス
# 2. 「Generate new token」で新しいトークンを作成
# 3. トークンをコピー

# プロジェクトルートに .env.supabase を作成（gitignored）
echo "SUPABASE_ACCESS_TOKEN=your_token_here" > .env.supabase
# mise が自動的にこのファイルを読み込みます

# プロジェクトにリンク（mise経由で実行）
mise run supabase:link

# マイグレーションをリモートに適用
mise run supabase:migrate

# TypeScript 型を生成
mise run supabase:types
```

**Web 版の環境変数設定**:
```bash
# web/.env.local を作成（.env.example を参考に）
cp web/.env.example web/.env.local
# VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定
```

## 5. Git・ブランチ戦略

### 基本方針
ブランチ戦略の詳細は [`CONTRIBUTING.md`](CONTRIBUTING.md#ブランチ戦略) を参照してください。ここでは運用上の恒久ルールと手順を定義します。

### ブランチ運用ルール
1. **`main` ブランチ**: 本番環境にデプロイ済みのコード。直接コミット禁止
2. **`feature/*` ブランチ**: 機能追加や修正作業用。`main` から派生し、完了後 `main` へマージ
3. **`<agent-name>/*` ブランチ**: AI エージェントが作業する場合の作業ブランチ
   - 例: `claude/add-timer-feature`, `copilot/fix-animation`

### ブランチ作成手順
```bash
# 機能開発ブランチ（人が作業）
git checkout main
git pull origin main
git checkout -b feature/add-new-icon

# AI 作業ブランチ（Claude が作業）
git checkout main
git pull origin main
git checkout -b claude/add-new-icon
```

### Pull Request の作成

#### GitHub CLI (gh) を使う方法（推奨）

```bash
# 初回のみ: GitHub CLI の認証
gh auth login

# PR 作成
gh pr create --base main --title "PR タイトル" --body "PR の説明"
```

### マージとレビュー
- すべてのマージは Pull Request 経由で実施
- AI が作成したブランチは、人が必ず内容を確認してから `main` へマージ
- `main` へのマージは、リリースチェックリスト（後述）を満たすこと

## 6. 標準ワークフロー

### CLI 開発フロー

```bash
# コードフォーマット
cargo fmt

# リント
cargo clippy

# テスト実行
cargo test

# 動作確認
cargo run
```

### Web 開発フロー

```bash
# リント
pnpm lint

# テスト
pnpm test

# ビルド
pnpm build
```

### mise によるバージョン統一（重要）
本プロジェクトでは、人間と AI エージェントが同一バージョンのツールを使用するため、**すべてのコマンド実行は mise 経由で行う**ことを原則とします。

#### mise タスクの使用（推奨）
`mise.toml` で定義されたタスクを使用することで、自動的に正しいバージョンのツールが使用されます。

#### カスタムコマンドの実行
mise.toml に定義されていないコマンドを実行する場合は、`eval "$(mise activate bash)"` で mise 環境を有効化してから実行します：

```bash
# 例: カスタムコマンドを実行
eval "$(mise activate bash)" && <your-command>
```

## 7. リリースチェックリスト

### CLI リリース前
- [ ] `cargo fmt` でコードが整形されている
- [ ] `cargo clippy` で警告がない
- [ ] `cargo test` ですべてのテストがパスしている
- [ ] `cargo build --release` でビルドが成功する
- [ ] 影響範囲とロールバック手順を PR に記載し、レビュー済み

### Web リリース前
- [ ] `pnpm lint` でリントエラーがない
- [ ] `pnpm test` ですべてのテストがパスしている
- [ ] `pnpm build` でビルドが成功する
- [ ] PWA マニフェストと Service Worker が正しく動作する
- [ ] 影響範囲とロールバック手順を PR に記載し、レビュー済み

## 8. セキュリティ・データ保護
- 秘密情報（鍵・トークン・個人情報）を Git に保存しない
- 認証情報は環境変数で管理する
- Supabase の認証情報は `.env.local` に保存し、`.gitignore` で除外
- ユーザーのセッションデータはローカルストレージ（SQLite/IndexedDB）に保存
- クラウド同期データは Supabase の Row Level Security (RLS) で保護

### Supabase セキュリティガイドライン
| 情報 | 公開可否 | 保管場所 |
|------|---------|---------|
| Project URL (`xxx.supabase.co`) | 公開OK | コードに直接書いてOK |
| anon key | 公開OK | `.env.local`（RLSで保護） |
| service_role key | **秘密** | 絶対にコードに入れない |
| DB パスワード | **秘密** | パスワードマネージャー |
| Access Token | **秘密** | 環境変数 or ローカル設定 |

## 9. エスカレーション

問題が発生した場合のエスカレーション先を定義します：

- **CLI 関連**: GitHub Issues で報告
- **Web 関連**: GitHub Issues で報告
- **セキュリティ関連**: プロジェクトオーナーに直接連絡
- **決済関連**: 慎重に対応、必ず人間がレビュー

## 10. 更新履歴

- 2026-01-17: Supabase クラウド同期の設定手順を追加
- 2025-01-04: sandoro プロジェクト用に初版作成

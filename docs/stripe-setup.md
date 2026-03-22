# Stripe セットアップガイド

sandoro の Pro プラン決済機能を有効化するための手順です。

## 料金プラン

| プラン | 価格 | 特徴 |
|--------|------|------|
| **月額** | $1.99/月 | 手軽に始められる |
| **年額** | $9.99/年 | 2ヶ月分お得（実質$0.83/月） |

### ドネーション「開発者に休憩を奢る」

サブスクリプションとは別に、開発者への応援として少額から支援できるドネーション機能です。

| アイテム | 価格 | 説明 |
|---------|------|------|
| ☕ 5分休憩 | $0.99 | ちょっと深呼吸してね |
| 🍵 15分休憩 | $2.99 | お茶でも飲んでゆっくり！ |
| 😴 昼寝タイム | $5.99 | たまにはがっつり休んで |
| 🛏️ ぐっすり睡眠 | $9.99 | 明日も頑張ってね |

**特典**: 累計ドネーションが **$29.99 以上** になると、**Pro 機能が永久解放**されます！

> 例: $9.99 × 3回 = $29.97 → あと $0.99 で Pro 解放！

> **注**: サブスクリプションの支払い額とドネーション額は別カウントです。

### 無料トライアル

- **7日間の無料トライアル**（カード登録不要）
- アカウント作成後、自動的にトライアル開始
- トライアル期間中はすべての Pro 機能が利用可能
- トライアル終了後は Free プランに戻る（自動課金なし）

### コスト分析

| 収益 | Stripe手数料 | 実収益 |
|------|-------------|--------|
| $1.99/月 | $0.37 | $1.62/月 |
| $9.99/年 | $0.66 | $9.33/年 |

**ドネーション**

| 収益 | Stripe手数料 | 実収益 |
|------|-------------|--------|
| $0.99 | $0.33 | $0.66 |
| $2.99 | $0.39 | $2.60 |
| $5.99 | $0.48 | $5.51 |
| $9.99 | $0.60 | $9.39 |

> 注: Stripe 手数料は 2.9% + $0.30/回

## 1. Stripe アカウント作成

1. [Stripe Dashboard](https://dashboard.stripe.com/) にアクセス
2. アカウントを作成（またはログイン）
3. **テストモード** が有効になっていることを確認（右上のトグル）

## 2. Product と Price の作成

### Stripe Dashboard で作成

1. **Products** → **Add product** をクリック
2. 以下の商品を作成:

#### sandoro Pro（サブスクリプション）

| 項目 | 値 |
|------|-----|
| Name | sandoro Pro |
| Description | ASCII art pomodoro timer - Pro features |

**Price 1: Monthly**
- Pricing model: Standard pricing
- Price: $1.99 USD
- Billing period: Monthly
- **Price ID をメモ** (例: `price_1abc123...`)

**Price 2: Yearly**
- Pricing model: Standard pricing
- Price: $9.99 USD
- Billing period: Yearly
- **Price ID をメモ**

#### ドネーション「開発者に休憩を奢る」

| 項目 | 値 |
|------|-----|
| Name | sandoro Donation |
| Description | Support the developer with a break! |

以下の4つの Price を作成（すべて One-time）:

| Price 名 | 価格 | メタデータ |
|---------|------|-----------|
| 5分休憩 | $0.99 USD | `donation_type: break_5min` |
| 15分休憩 | $2.99 USD | `donation_type: break_15min` |
| 昼寝タイム | $5.99 USD | `donation_type: nap` |
| ぐっすり睡眠 | $9.99 USD | `donation_type: sleep` |

> **重要**: 各 Price の **Price ID をメモ**しておく

## 3. Webhook 設定

1. **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
3. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. **Signing secret をメモ** (例: `whsec_...`)

## 4. Customer Portal 設定

1. **Settings** → **Billing** → **Customer portal**
2. 以下を有効化:
   - ✅ Allow customers to update their payment methods
   - ✅ Allow customers to view their invoice history
   - ✅ Allow customers to cancel subscriptions
3. **Save changes**

## 5. Supabase Edge Functions の環境変数設定

1. [Supabase Dashboard](https://supabase.com/dashboard) → プロジェクト選択
2. **Edge Functions** → **Secrets**
3. 以下の秘密情報を追加:

| Name | Value |
|------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (Stripe Dashboard → Developers → API keys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (Step 3 でメモしたもの) |

> **注**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` は自動で設定されます。

## 6. Web アプリの環境変数設定

### ローカル開発用 (.env.local)

```bash
# web/.env.local
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Pro subscription prices
VITE_STRIPE_PRICE_MONTHLY=price_...
VITE_STRIPE_PRICE_YEARLY=price_...

# Donation prices
VITE_STRIPE_PRICE_DONATION_5MIN=price_...
VITE_STRIPE_PRICE_DONATION_15MIN=price_...
VITE_STRIPE_PRICE_DONATION_NAP=price_...
VITE_STRIPE_PRICE_DONATION_SLEEP=price_...
```

### Vercel 本番環境

1. Vercel Dashboard → Settings → Environment Variables
2. 上記と同じ変数を追加（本番は `pk_live_...` を使用）

## 7. Edge Functions のデプロイ

```bash
# Supabase CLI でログイン
npx supabase login

# Functions をデプロイ（--no-verify-jwt フラグが必要）
npx supabase functions deploy create-checkout --no-verify-jwt
npx supabase functions deploy create-donation-checkout --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy customer-portal --no-verify-jwt
```

> **重要**: `--no-verify-jwt` フラグは必須です。このフラグがないと、Supabase のインフラレベルで JWT 検証が行われ、Edge Function 内での認証処理と競合して 401 エラーが発生します。Edge Function 内で独自に JWT を検証しています。

## 8. マイグレーション実行

```bash
npx supabase db push --project-ref <your-project-ref>
```

## 9. テスト

### テスト用カード番号

| シナリオ | カード番号 |
|---------|-----------|
| 成功 | `4242 4242 4242 4242` |
| 認証必要 | `4000 0025 0000 3155` |
| 失敗 | `4000 0000 0000 0002` |

有効期限: 任意の未来日、CVC: 任意の3桁

## 本番移行チェックリスト

- [ ] Stripe Dashboard でテストモードを **OFF** に
- [ ] 本番用 API キーに差し替え
- [ ] Webhook endpoint を本番 URL に更新
- [ ] 本番用 Webhook signing secret に更新
- [ ] Vercel 環境変数を本番用に更新

## 返金対応（手動）

返金は Stripe Dashboard で手動対応します。

### 返金手順

1. [Stripe Dashboard](https://dashboard.stripe.com) → **Payments**
2. 該当の支払いをクリック
3. 右上の **Refund** をクリック
4. 返金額を入力（全額 or 一部）
5. 理由を選択して **Refund** を実行

### 返金後の対応

**サブスクリプションの場合**:
- 返金しても自動的にサブスクはキャンセルされません
- 必要に応じて **Subscriptions** から手動でキャンセル
- Webhook が `customer.subscription.deleted` を受信し、DB の status が `canceled` に更新されます

**ドネーションの場合**:
- 返金しても donations テーブルは自動更新されません
- 必要に応じて Supabase の Table Editor で status を `refunded` に手動変更

### 返金ポリシー（推奨）

- サブスクリプション: 購入後7日以内は全額返金
- ドネーション: 原則返金不可（寄付の性質上）

> **注**: 返金自動化が必要な場合は `charge.refunded` Webhook イベントを追加実装してください。

## トラブルシューティング

### 401 "Invalid JWT" エラー
- Edge Functions が `--no-verify-jwt` フラグなしでデプロイされている可能性
- 再デプロイ: `npx supabase functions deploy <function-name> --no-verify-jwt`

### Edge Function タイムアウト / WORKER_ERROR
- Stripe SDK のバージョンが重すぎる可能性
- `stripe@13.10.0` を使用（v14 以降は Deno 環境で問題あり）
- インポート例: `import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno&deno-std=0.177.0';`

### Webhook が届かない
- Endpoint URL が正しいか確認
- Supabase Edge Functions がデプロイされているか確認
- Stripe Dashboard → Webhooks → 該当 endpoint → Recent events で確認
- `--no-verify-jwt` フラグでデプロイされているか確認

### ドネーション後に累計が更新されない
- donations テーブルに pending レコードが作成されているか確認
- Webhook が 200 を返しているか Stripe Dashboard で確認
- ログ確認: `npx supabase functions logs stripe-webhook`
- Webhook イベントを再送して動作確認

### 購入後に Pro にならない
- Supabase → Table Editor → subscriptions でステータス確認
- Edge Functions のログを確認: `npx supabase functions logs stripe-webhook`

### CORS エラー
- Edge Functions の `corsHeaders` に origin が含まれているか確認

### Supabase CLI "Access token not provided" エラー
- `npx supabase login` で再ログイン
- または Dashboard でトークン生成: https://supabase.com/dashboard/account/tokens
- `export SUPABASE_ACCESS_TOKEN=your_token` で設定

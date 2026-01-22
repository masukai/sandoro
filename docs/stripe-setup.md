# Stripe セットアップガイド

sandoro の Pro プラン決済機能を有効化するための手順です。

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
- Price: $12.00 USD
- Billing period: Yearly
- **Price ID をメモ**

#### sandoro Pro Lifetime（一回払い）

| 項目 | 値 |
|------|-----|
| Name | sandoro Pro Lifetime |
| Description | ASCII art pomodoro timer - Pro features (lifetime) |

**Price: One-time**
- Pricing model: Standard pricing
- Price: $36.00 USD
- One time
- **Price ID をメモ**

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
VITE_STRIPE_PRICE_MONTHLY=price_...
VITE_STRIPE_PRICE_YEARLY=price_...
VITE_STRIPE_PRICE_LIFETIME=price_...
```

### Vercel 本番環境

1. Vercel Dashboard → Settings → Environment Variables
2. 上記と同じ変数を追加（本番は `pk_live_...` を使用）

## 7. Edge Functions のデプロイ

```bash
# Supabase CLI でログイン
npx supabase login

# Functions をデプロイ
npx supabase functions deploy create-checkout --project-ref <your-project-ref>
npx supabase functions deploy stripe-webhook --project-ref <your-project-ref>
npx supabase functions deploy customer-portal --project-ref <your-project-ref>
```

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

## トラブルシューティング

### Webhook が届かない
- Endpoint URL が正しいか確認
- Supabase Edge Functions がデプロイされているか確認
- Stripe Dashboard → Webhooks → 該当 endpoint → Recent events で確認

### 購入後に Pro にならない
- Supabase → Table Editor → subscriptions でステータス確認
- Edge Functions のログを確認: `npx supabase functions logs stripe-webhook`

### CORS エラー
- Edge Functions の `corsHeaders` に origin が含まれているか確認

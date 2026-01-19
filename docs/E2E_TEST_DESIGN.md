# E2E Test Design - sandoro Web Authentication

## 概要

このドキュメントは sandoro Web版の認証・データ同期機能に関する E2E テスト設計を定義します。

## テストツール

- **Playwright**: E2Eテストフレームワーク
- **Supabase Test Helpers**: テスト用ユーザー管理

## テストシナリオ

### 1. 認証フロー

#### 1.1 ログイン画面表示

```typescript
test('should display Sign in button when not authenticated', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('should open login modal when clicking Sign in', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByText('Sign in to sandoro')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in with GitHub' })).toBeVisible();
});

test('should close login modal when clicking Cancel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Sign in to sandoro')).not.toBeVisible();
});

test('should close login modal when clicking outside', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Click backdrop
  await page.locator('.bg-black\\/50').click();
  await expect(page.getByText('Sign in to sandoro')).not.toBeVisible();
});
```

#### 1.2 OAuth認証（モック）

```typescript
// Note: 実際のOAuth認証はモックまたはテスト用アカウントを使用
test('should redirect to Google OAuth when clicking Google button', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).click();

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: 'Sign in with Google' }).click(),
  ]);

  // Google OAuthページへリダイレクトされることを確認
  expect(popup.url()).toContain('accounts.google.com');
});
```

#### 1.3 ログイン状態の表示

```typescript
test('should display user info when authenticated', async ({ page }) => {
  // テスト用にログイン状態をセットアップ（supabase session mock）
  await page.goto('/');

  // ログイン後
  await expect(page.getByRole('img', { name: 'Avatar' })).toBeVisible();
  await expect(page.getByText('Test User')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
});
```

#### 1.4 ログアウト

```typescript
test('should sign out when clicking Sign out', async ({ page }) => {
  // テスト用にログイン状態をセットアップ
  await page.goto('/');

  await page.getByRole('button', { name: 'Sign out' }).click();

  // ログアウト後
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('Test User')).not.toBeVisible();
});
```

### 2. データ同期（Phase 3.4 以降）

#### 2.1 セッション完了時の保存

```typescript
test('should save completed session to Supabase', async ({ page }) => {
  // ログイン状態でセットアップ
  await page.goto('/');

  // タイマー開始
  await page.getByRole('button', { name: 'Start' }).click();

  // タイマー完了（短いテスト用時間に設定）
  await page.waitForTimeout(5000); // テスト用に短縮

  // Supabaseにデータが保存されたか確認
  // → API呼び出しをインターセプトして検証
});
```

#### 2.2 セッション履歴の表示

```typescript
test('should display synced sessions in Stats view', async ({ page }) => {
  // ログイン状態で、Supabaseにテストデータをセットアップ
  await page.goto('/');
  await page.getByRole('button', { name: 'Stats' }).click();

  // Supabaseから取得したセッションが表示される
  await expect(page.getByText('Today')).toBeVisible();
  // セッション数やヒートマップを確認
});
```

#### 2.3 設定の同期

```typescript
test('should sync settings to Supabase', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();

  // 設定を変更
  await page.getByLabel('Work Duration').fill('30');

  // Supabaseに保存されたか確認（API呼び出しをインターセプト）
});

test('should load settings from Supabase on login', async ({ page }) => {
  // Supabaseにテスト用設定をセットアップ
  await page.goto('/');

  // ログイン後、設定が反映されている
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByLabel('Work Duration')).toHaveValue('30');
});
```

### 3. オフライン対応（Phase 3.4 以降）

```typescript
test('should work offline and sync when online', async ({ page, context }) => {
  await page.goto('/');

  // オフラインモードに切り替え
  await context.setOffline(true);

  // タイマーを実行（ローカルに保存される）
  await page.getByRole('button', { name: 'Start' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();

  // オンラインに復帰
  await context.setOffline(false);

  // 自動同期を確認
  await page.waitForResponse(response =>
    response.url().includes('supabase') && response.status() === 200
  );
});
```

## テスト環境セットアップ

### Playwright インストール

```bash
cd web
pnpm add -D @playwright/test
npx playwright install
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

### テスト用 Supabase ヘルパー

```typescript
// e2e/helpers/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // テスト用のみ

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function createTestUser(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

export async function deleteTestUser(userId: string) {
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

export async function seedTestSessions(userId: string) {
  const sessions = [
    {
      user_id: userId,
      session_type: 'work',
      duration_seconds: 1500,
      completed_at: new Date().toISOString(),
      tag: 'Work',
    },
  ];

  const { error } = await supabaseAdmin.from('sessions').insert(sessions);
  if (error) throw error;
}
```

## 実行方法

```bash
# 全テスト実行
pnpm exec playwright test

# 特定のテストファイル
pnpm exec playwright test auth.spec.ts

# UIモードで実行（デバッグ用）
pnpm exec playwright test --ui

# レポート表示
pnpm exec playwright show-report
```

## CI 統合

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: Install dependencies
        run: cd web && pnpm install

      - name: Install Playwright Browsers
        run: cd web && npx playwright install --with-deps

      - name: Run E2E tests
        run: cd web && pnpm exec playwright test
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: web/playwright-report/
```

## 注意事項

1. **OAuth テスト**: 実際のOAuth認証はテスト困難なため、以下のアプローチを検討
   - テスト用ログイン機能（開発環境のみ）
   - Supabase Session の直接セット
   - OAuth モック

2. **テストデータ管理**: テスト後にデータをクリーンアップ
   - `afterEach` で `deleteTestUser` を呼び出す
   - テスト用 namespace/prefix を使用

3. **並列実行**: ユーザーデータの衝突を避けるため、各テストで一意のユーザーを作成

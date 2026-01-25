import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSupabaseSettings';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { useDonation, PRO_THRESHOLD_CENTS } from '../hooks/useDonation';
import { LoginRequired } from './LoginRequired';

// Preview component for unauthenticated users
function SupportPreview() {
  return (
    <div className="flex flex-col gap-4 select-none">
      <h2 className="text-base font-bold">Support sandoro</h2>

      {/* Subscription Preview */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold" style={{ color: 'var(--sandoro-secondary)' }}>Subscription</h3>
        <div className="flex flex-col gap-2 bg-sandoro-secondary/10 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs rounded-full bg-sandoro-secondary/50 font-bold">FREE</span>
            <span className="text-sm">Free Plan</span>
          </div>
          <div className="flex flex-col gap-1 text-xs text-sandoro-secondary">
            <p className="font-semibold" style={{ color: 'var(--sandoro-fg)' }}>Unlock with Pro:</p>
            <ul className="list-disc list-inside pl-2 space-y-0.5">
              <li>🍅 Pro icons</li>
              <li>🌈 All colors + rainbow</li>
              <li>📊 CSV export</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Donation Preview */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold" style={{ color: 'var(--sandoro-secondary)' }}>Buy the Developer a Break</h3>
        <div className="flex flex-col gap-2 bg-sandoro-secondary/10 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg border border-sandoro-secondary/30">
              <span className="text-2xl">☕</span>
              <span className="text-sm font-medium">5-min Break</span>
              <span className="text-xs text-sandoro-secondary">$0.99</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg border border-sandoro-secondary/30">
              <span className="text-2xl">🍵</span>
              <span className="text-sm font-medium">15-min Break</span>
              <span className="text-xs text-sandoro-secondary">$2.99</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Support() {
  const { user, loading } = useAuth();
  const { accentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const { settings } = useSettings();
  const { getInfo, createCheckout, openPortal, loading: subscriptionLoading } = useSubscription();
  const { getInfo: getDonationInfo, createDonationCheckout, donationItems, loading: donationLoading } = useDonation();
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [donationLoading2, setDonationLoading2] = useState(false);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [showDonationSuccessMessage, setShowDonationSuccessMessage] = useState(false);

  // Check URL params for success/canceled
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setShowSuccessMessage(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
    if (params.get('donation') === 'success') {
      setShowDonationSuccessMessage(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Hide message after 5 seconds
      setTimeout(() => setShowDonationSuccessMessage(false), 5000);
    }
    if (params.get('canceled') === 'true' || params.get('donation') === 'canceled') {
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const subscriptionInfo = getInfo();
  const donationInfo = getDonationInfo();

  // Show login required screen if not authenticated
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-sandoro-secondary">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginRequired
        title="Support sandoro"
        titleJa="sandoro を応援"
        description="Upgrade to Pro or support development with donations."
        descriptionJa="Pro プランへのアップグレードやドネーションで開発を応援できます。"
        icon="💝"
        features={[
          'Unlock Pro features with subscription',
          'Buy the developer a break with donations',
          'Get Pro forever with $29.99+ in donations',
          'Manage your subscription anytime',
        ]}
        featuresJa={[
          'サブスクリプションで Pro 機能を解放',
          'ドネーションで開発者に休憩を奢る',
          '累計 $29.99 以上のドネーションで Pro 永久解放',
          'いつでもサブスクリプションを管理',
        ]}
        previewContent={<SupportPreview />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-bold">
        {settings.language === 'ja' ? 'sandoro を応援' : 'Support sandoro'}
      </h2>

      {/* Pro Subscription Section */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-sandoro-secondary">
          {settings.language === 'ja' ? 'サブスクリプション' : 'Subscription'}
        </h3>

        {/* Success message */}
        {showSuccessMessage && (
          <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50">
            <p className="text-sm text-green-400">
              {settings.language === 'ja'
                ? '🎉 Pro プランへのアップグレードありがとうございます！'
                : '🎉 Thank you for upgrading to Pro!'}
            </p>
          </div>
        )}

        {/* Error message */}
        {upgradeError && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
            <p className="text-sm text-red-400">{upgradeError}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 bg-sandoro-secondary/10 rounded-lg p-3">
          {subscriptionLoading ? (
            <p className="text-sm text-sandoro-secondary">Loading...</p>
          ) : subscriptionInfo.isTrialing ? (
            /* Trial user view */
            <>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold">
                  TRIAL
                </span>
                <span className="text-sm" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? '無料トライアル中' : 'Free Trial Active'}
                </span>
              </div>
              <p className="text-xs text-sandoro-secondary">
                {settings.language === 'ja'
                  ? `残り ${subscriptionInfo.trialDaysRemaining} 日 - すべての Pro 機能が利用可能`
                  : `${subscriptionInfo.trialDaysRemaining} days left - All Pro features unlocked`}
              </p>
              <div className="flex flex-col gap-1 text-xs text-sandoro-secondary">
                <p className="font-semibold" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? 'トライアル後も Pro を継続:' : 'Continue Pro after trial:'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    try {
                      setUpgradeLoading(true);
                      setUpgradeError(null);
                      await createCheckout(import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '');
                    } catch (err) {
                      setUpgradeError(err instanceof Error ? err.message : 'Failed to start checkout');
                    } finally {
                      setUpgradeLoading(false);
                    }
                  }}
                  disabled={upgradeLoading}
                  className={`px-4 py-2 text-sm rounded font-bold transition-colors ${
                    isRainbow ? 'rainbow-gradient-bg' : ''
                  }`}
                  style={{
                    backgroundColor: !isRainbow ? 'var(--sandoro-primary)' : undefined,
                    color: !isRainbow ? 'var(--sandoro-bg)' : undefined,
                    opacity: upgradeLoading ? 0.5 : 1,
                  }}
                >
                  {upgradeLoading ? '...' : settings.language === 'ja' ? '$1.99/月' : '$1.99/mo'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      setUpgradeLoading(true);
                      setUpgradeError(null);
                      await createCheckout(import.meta.env.VITE_STRIPE_PRICE_YEARLY || '');
                    } catch (err) {
                      setUpgradeError(err instanceof Error ? err.message : 'Failed to start checkout');
                    } finally {
                      setUpgradeLoading(false);
                    }
                  }}
                  disabled={upgradeLoading}
                  className="px-4 py-2 text-sm rounded border border-sandoro-secondary/50 hover:border-sandoro-primary transition-colors"
                  style={{ color: 'var(--sandoro-fg)', opacity: upgradeLoading ? 0.5 : 1 }}
                >
                  {settings.language === 'ja' ? '$9.99/年（2ヶ月分お得）' : '$9.99/yr (Save 2 mo)'}
                </button>
              </div>
            </>
          ) : subscriptionInfo.isPro ? (
            /* Paid Pro user view */
            <>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold">
                  PRO
                </span>
                <span className="text-sm" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? 'Pro プラン有効' : 'Pro Plan Active'}
                </span>
              </div>
              {subscriptionInfo.currentPeriodEnd && (
                <p className="text-xs text-sandoro-secondary">
                  {subscriptionInfo.cancelAtPeriodEnd
                    ? settings.language === 'ja'
                      ? `${subscriptionInfo.currentPeriodEnd.toLocaleDateString()} に終了予定`
                      : `Ends on ${subscriptionInfo.currentPeriodEnd.toLocaleDateString()}`
                    : settings.language === 'ja'
                    ? `次回更新: ${subscriptionInfo.currentPeriodEnd.toLocaleDateString()}`
                    : `Renews on ${subscriptionInfo.currentPeriodEnd.toLocaleDateString()}`}
                </p>
              )}
              <button
                onClick={async () => {
                  try {
                    setUpgradeError(null);
                    await openPortal();
                  } catch (err) {
                    setUpgradeError(err instanceof Error ? err.message : 'Failed to open portal');
                  }
                }}
                className="px-4 py-2 text-sm rounded border border-sandoro-secondary/50 hover:border-sandoro-primary transition-colors"
                style={{ color: 'var(--sandoro-fg)' }}
              >
                {settings.language === 'ja' ? '購読を管理' : 'Manage Subscription'}
              </button>
            </>
          ) : (
            /* Free user view */
            <>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs rounded-full bg-sandoro-secondary/50 text-sandoro-fg font-bold">
                  FREE
                </span>
                <span className="text-sm" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? '無料プラン' : 'Free Plan'}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-xs text-sandoro-secondary">
                <p className="font-semibold" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? 'Pro で解放される機能:' : 'Unlock with Pro:'}
                </p>
                <ul className="list-disc list-inside pl-2 space-y-0.5">
                  <li>{settings.language === 'ja' ? '🍅 トマト、🐱 猫などの Pro アイコン' : '🍅 Tomato, 🐱 Cat, and more Pro icons'}</li>
                  <li>{settings.language === 'ja' ? '🌈 全10色 + レインボー + カスタムカラー' : '🌈 All 10 colors + rainbow + custom'}</li>
                  <li>{settings.language === 'ja' ? '📊 CSV エクスポート' : '📊 CSV export'}</li>
                  <li>{settings.language === 'ja' ? '🚫 広告なし' : '🚫 Ad-free experience'}</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    try {
                      setUpgradeLoading(true);
                      setUpgradeError(null);
                      await createCheckout(import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '');
                    } catch (err) {
                      setUpgradeError(err instanceof Error ? err.message : 'Failed to start checkout');
                    } finally {
                      setUpgradeLoading(false);
                    }
                  }}
                  disabled={upgradeLoading}
                  className={`px-4 py-2 text-sm rounded font-bold transition-colors ${
                    isRainbow ? 'rainbow-gradient-bg' : ''
                  }`}
                  style={{
                    backgroundColor: !isRainbow ? 'var(--sandoro-primary)' : undefined,
                    color: !isRainbow ? 'var(--sandoro-bg)' : undefined,
                    opacity: upgradeLoading ? 0.5 : 1,
                  }}
                >
                  {upgradeLoading
                    ? '...'
                    : settings.language === 'ja'
                    ? '$1.99/月'
                    : '$1.99/mo'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      setUpgradeLoading(true);
                      setUpgradeError(null);
                      await createCheckout(import.meta.env.VITE_STRIPE_PRICE_YEARLY || '');
                    } catch (err) {
                      setUpgradeError(err instanceof Error ? err.message : 'Failed to start checkout');
                    } finally {
                      setUpgradeLoading(false);
                    }
                  }}
                  disabled={upgradeLoading}
                  className="px-4 py-2 text-sm rounded border border-sandoro-primary/50 hover:border-sandoro-primary transition-colors"
                  style={{
                    color: 'var(--sandoro-primary)',
                    opacity: upgradeLoading ? 0.5 : 1,
                  }}
                >
                  {settings.language === 'ja' ? '$9.99/年（2ヶ月分お得）' : '$9.99/yr (Save 2 mo)'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Donation Section - 開発者に休憩を奢る */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-sandoro-secondary">
          {settings.language === 'ja' ? '開発者に休憩を奢る' : 'Buy the Developer a Break'}
        </h3>

        {/* Donation success message */}
        {showDonationSuccessMessage && (
          <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/50">
            <p className="text-sm text-green-400">
              {settings.language === 'ja'
                ? '🎉 ありがとうございます！開発者に休憩を奢りました！'
                : '🎉 Thank you! You bought the developer a break!'}
            </p>
          </div>
        )}

        {/* Donation error message */}
        {donationError && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
            <p className="text-sm text-red-400">{donationError}</p>
          </div>
        )}

        <div className="flex flex-col gap-3 bg-sandoro-secondary/10 rounded-lg p-3">
          {/* Description */}
          <p className="text-xs text-sandoro-secondary">
            {settings.language === 'ja'
              ? 'sandoro の開発を応援してください。累計 $29.99 以上のドネーションで Pro 機能が永久解放されます！'
              : 'Support sandoro development. Donate $29.99 or more in total to unlock Pro features forever!'}
          </p>
          <p className="text-xs text-sandoro-secondary/70">
            {settings.language === 'ja'
              ? '※ サブスクリプションの支払いとは別カウントです'
              : '※ Counted separately from subscription payments'}
          </p>

          {/* Progress bar - always visible */}
          {!donationLoading && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? '累計ドネーション' : 'Total donated'}
                </span>
                <span className="text-sandoro-secondary">
                  {donationInfo.totalFormatted} / ${(PRO_THRESHOLD_CENTS / 100).toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-sandoro-secondary/30 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    donationInfo.isProFromDonation
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                      : ''
                  }`}
                  style={{
                    width: `${donationInfo.progressPercent}%`,
                    backgroundColor: !donationInfo.isProFromDonation ? 'var(--sandoro-primary)' : undefined,
                  }}
                />
              </div>
              {donationInfo.isProFromDonation ? (
                <p className="text-xs text-green-400">
                  {settings.language === 'ja'
                    ? '🎉 Pro 機能が永久解放されました！'
                    : '🎉 Pro features unlocked forever!'}
                </p>
              ) : (
                <p className="text-xs text-sandoro-secondary">
                  {settings.language === 'ja'
                    ? `あと ${donationInfo.remainingForProFormatted} で Pro 解放！`
                    : `${donationInfo.remainingForProFormatted} more for Pro!`}
                </p>
              )}
            </div>
          )}

          {/* Donation items */}
          <div className="grid grid-cols-2 gap-2">
            {donationItems.map((item) => (
              <button
                key={item.type}
                onClick={async () => {
                  try {
                    setDonationLoading2(true);
                    setDonationError(null);
                    await createDonationCheckout(item);
                  } catch (err) {
                    setDonationError(err instanceof Error ? err.message : 'Failed to start checkout');
                  } finally {
                    setDonationLoading2(false);
                  }
                }}
                disabled={donationLoading2 || donationLoading}
                className="flex flex-col items-center gap-1 p-3 rounded-lg border border-sandoro-secondary/30 hover:border-sandoro-primary transition-colors"
                style={{ opacity: donationLoading2 || donationLoading ? 0.5 : 1 }}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--sandoro-fg)' }}>
                  {settings.language === 'ja' ? item.nameJa : item.nameEn}
                </span>
                <span className="text-xs text-sandoro-secondary">
                  {settings.language === 'ja' ? item.descriptionJa : item.descriptionEn}
                </span>
                <span
                  className="text-sm font-bold mt-1"
                  style={{ color: 'var(--sandoro-primary)' }}
                >
                  {item.price}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

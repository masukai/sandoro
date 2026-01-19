import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useSettings } from '../hooks/useSupabaseSettings';
import { LoginModal } from './LoginModal';

interface LoginRequiredProps {
  title: string;
  titleJa?: string;
  description: string;
  descriptionJa?: string;
  features?: string[];
  featuresJa?: string[];
  previewContent?: React.ReactNode;
  icon?: string; // Custom icon emoji
}

const i18n = {
  en: {
    cta: 'Get started free',
    trust: 'No credit card required • Sign in with Google or GitHub',
  },
  ja: {
    cta: '無料で始める',
    trust: 'クレジットカード不要 • Google または GitHub でログイン',
  },
};

export function LoginRequired({
  title,
  titleJa,
  description,
  descriptionJa,
  features,
  featuresJa,
  previewContent,
  icon = '✨',
}: LoginRequiredProps) {
  const { accentColor, resolvedTheme } = useTheme();
  const { settings } = useSettings();
  const lang = settings.language;
  const isRainbow = accentColor === 'rainbow';
  const isDark = resolvedTheme === 'dark';
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Use Japanese text if available and language is Japanese
  const displayTitle = lang === 'ja' && titleJa ? titleJa : title;
  const displayDescription = lang === 'ja' && descriptionJa ? descriptionJa : description;
  const displayFeatures = lang === 'ja' && featuresJa ? featuresJa : features;
  const texts = i18n[lang] || i18n.en;

  // Theme-aware card background
  const cardBg = isDark ? 'rgba(17, 17, 17, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const cardBorder = isDark
    ? 'rgba(var(--sandoro-primary-rgb, 34, 211, 238), 0.3)'
    : 'rgba(0, 0, 0, 0.1)';
  const cardShadow = isDark
    ? '0 8px 32px rgba(0, 0, 0, 0.4)'
    : '0 8px 32px rgba(0, 0, 0, 0.15)';

  return (
    <div className="relative min-h-[60vh]">
      {/* Preview content - clearly visible behind card */}
      {previewContent && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="opacity-70 blur-[1px] scale-[0.99] origin-top" aria-hidden="true">
            {previewContent}
          </div>
          {/* Minimal gradient - only fade at very top/bottom */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, var(--sandoro-bg) 0%, transparent 8%, transparent 92%, var(--sandoro-bg) 100%)',
            }}
          />
        </div>
      )}

      {/* Floating card overlay */}
      <div className="relative flex flex-col items-center justify-center py-16 text-center px-4">
        <div
          className="p-6 sm:p-8 rounded-2xl backdrop-blur-lg max-w-sm w-full"
          style={{
            backgroundColor: cardBg,
            border: `1px solid ${cardBorder}`,
            boxShadow: cardShadow,
          }}
        >
          {/* Icon - positive, not lock */}
          <div className="text-4xl mb-3 inline-block" role="img" aria-label="feature icon">
            {icon}
          </div>

          {/* Title */}
          <h2
            className={`text-lg font-bold mb-2 ${isRainbow ? 'rainbow-gradient' : ''}`}
            style={!isRainbow ? { color: 'var(--sandoro-primary)' } : undefined}
          >
            {displayTitle}
          </h2>

          {/* Description */}
          <p className="text-sandoro-secondary mb-4 text-sm leading-relaxed">{displayDescription}</p>

          {/* Feature list - improved visibility */}
          {displayFeatures && displayFeatures.length > 0 && (
            <div className="mb-5 space-y-1.5 text-left">
              {displayFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span
                    className={`flex-shrink-0 text-xs ${isRainbow ? 'rainbow-gradient' : ''}`}
                    style={!isRainbow ? { color: 'var(--sandoro-primary)' } : undefined}
                  >
                    ✓
                  </span>
                  <span style={{ color: 'var(--sandoro-fg)', opacity: 0.85 }}>{feature}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA Button - more inviting */}
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className={`w-full px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isRainbow
                ? 'rainbow-gradient-bg text-white'
                : 'bg-sandoro-primary text-white hover:brightness-110'
            }`}
          >
            {texts.cta}
          </button>

          {/* Trust signal */}
          <p className="mt-3 text-xs text-sandoro-secondary/60">{texts.trust}</p>
        </div>
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}

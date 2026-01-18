import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { LoginModal } from './LoginModal';

interface LoginRequiredProps {
  title: string;
  description: string;
  features?: string[];
}

export function LoginRequired({ title, description, features }: LoginRequiredProps) {
  const { accentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="text-4xl mb-4">🔒</div>
      <h2 className={`text-xl font-semibold mb-2 ${isRainbow ? 'rainbow-gradient' : ''}`}>
        {title}
      </h2>
      <p className="text-sandoro-secondary mb-4 max-w-md">
        {description}
      </p>
      {features && features.length > 0 && (
        <ul className="text-sandoro-secondary text-sm mb-6 space-y-1">
          {features.map((feature, index) => (
            <li key={index}>• {feature}</li>
          ))}
        </ul>
      )}
      <button
        onClick={() => setIsLoginModalOpen(true)}
        className={`px-6 py-2 rounded-md border transition-colors ${
          isRainbow
            ? 'rainbow-gradient-bg border-transparent text-white'
            : 'bg-sandoro-primary text-white border-sandoro-primary hover:opacity-80'
        }`}
      >
        Sign in
      </button>
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

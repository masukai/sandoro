import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { LoginModal } from './LoginModal';

export function AuthButton() {
  const { user, loading, signOut } = useAuth();
  const { accentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="text-sm text-sandoro-secondary">
        ...
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt="Avatar"
            className="w-6 h-6 rounded-full"
          />
        )}
        <span className="text-sm text-sandoro-secondary hidden sm:inline">
          {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
        </span>
        <button
          onClick={signOut}
          className="text-sm text-sandoro-secondary hover:text-sandoro-fg transition-colors"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsLoginModalOpen(true)}
        className={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
          isRainbow
            ? 'rainbow-gradient border-sandoro-secondary hover:border-sandoro-fg'
            : 'text-sandoro-primary border-sandoro-primary hover:bg-sandoro-primary hover:text-sandoro-bg'
        }`}
      >
        Sign in
      </button>
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </>
  );
}

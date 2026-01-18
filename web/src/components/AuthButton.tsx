import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

export function AuthButton() {
  const { user, loading, signInWithGoogle, signInWithGitHub, signOut } = useAuth();
  const { accentColor } = useTheme();
  const isRainbow = accentColor === 'rainbow';

  if (loading) {
    return (
      <div className="text-sm text-sandoro-secondary">
        Loading...
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
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={signInWithGoogle}
        className={`text-sm px-2 py-1 rounded transition-colors ${
          isRainbow
            ? 'rainbow-gradient'
            : 'text-sandoro-primary hover:opacity-80'
        }`}
        title="Sign in with Google"
      >
        Google
      </button>
      <button
        onClick={signInWithGitHub}
        className={`text-sm px-2 py-1 rounded transition-colors ${
          isRainbow
            ? 'rainbow-gradient'
            : 'text-sandoro-primary hover:opacity-80'
        }`}
        title="Sign in with GitHub"
      >
        GitHub
      </button>
    </div>
  );
}

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../useAuth';
import type { ReactNode } from 'react';

// Mock Supabase
const mockGetSession = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        mockOnAuthStateChange(callback);
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      },
    },
  },
  signInWithGoogle: () => mockSignInWithOAuth('google'),
  signInWithGitHub: () => mockSignInWithOAuth('github'),
  signOut: () => mockSignOut(),
}));

// Mock user data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    name: 'Test User',
    avatar_url: 'https://example.com/avatar.png',
  },
};

const mockSession = {
  user: mockUser,
  access_token: 'test-token',
};

// Wrapper component for providing AuthContext
function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
  });

  describe('AuthProvider', () => {
    it('should provide initial loading state', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);

      // After session check completes
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should provide null user when not authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
    });

    it('should provide user when authenticated', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    it('should throw error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });

  describe('signInWithGoogle', () => {
    it('should call signInWithOAuth with google provider', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith('google');
    });

    it('should handle sign in error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithOAuth.mockResolvedValue({ error: new Error('Sign in failed') });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('signInWithGitHub', () => {
    it('should call signInWithOAuth with github provider', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithGitHub();
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith('github');
    });
  });

  describe('signOut', () => {
    it('should call signOut', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should handle sign out error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });
      mockSignOut.mockResolvedValue({ error: new Error('Sign out failed') });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('auth state changes', () => {
    it('should subscribe to auth state changes on mount', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      renderHook(() => useAuth(), { wrapper });

      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });

    it('should update user when auth state changes', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBe(null);

      // Simulate auth state change
      const authStateCallback = (mockOnAuthStateChange as Mock).mock.calls[0][0];

      act(() => {
        authStateCallback('SIGNED_IN', mockSession);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    it('should clear user when signed out', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Simulate sign out
      const authStateCallback = (mockOnAuthStateChange as Mock).mock.calls[0][0];

      act(() => {
        authStateCallback('SIGNED_OUT', null);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
    });
  });
});

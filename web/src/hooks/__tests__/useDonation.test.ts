import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDonation, PRO_THRESHOLD_CENTS, DONATION_ITEMS } from '../useDonation';

// Mock user data
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

let mockAuthUser: typeof mockUser | null = null;

vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: mockAuthUser,
  }),
}));

// Mock Supabase
const mockSelect = vi.fn();
const mockChannel = vi.fn();
const mockOn = vi.fn();
const mockSubscribe = vi.fn();
const mockRemoveChannel = vi.fn();
const mockGetSession = vi.fn();

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => mockSelect(),
            }),
          }),
        }),
      }),
      channel: (name: string) => {
        mockChannel(name);
        return {
          on: (_event: string, _config: unknown, callback: unknown) => {
            mockOn(_event, _config, callback);
            return {
              subscribe: () => {
                mockSubscribe();
                return {};
              },
            };
          },
        };
      },
      removeChannel: () => mockRemoveChannel(),
      auth: {
        getSession: () => mockGetSession(),
      },
    },
  };
});

// Mock fetch for checkout creation
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const originalLocation = window.location;
const mockLocationHref = vi.fn();

beforeEach(() => {
  // @ts-expect-error - mocking location
  delete window.location;
  // @ts-expect-error - mocking location with partial implementation
  window.location = {
    ...originalLocation,
    origin: 'http://localhost:3000',
    href: '',
  };
  Object.defineProperty(window.location, 'href', {
    set: mockLocationHref,
    get: () => '',
  });
});

afterEach(() => {
  // @ts-expect-error - restoring original location
  window.location = originalLocation;
});

// Mock donation data
const mockDonations = [
  {
    id: 'donation-1',
    user_id: mockUser.id,
    amount_cents: 99,
    currency: 'usd',
    donation_type: 'break_5min',
    status: 'completed',
    created_at: '2025-01-19T10:00:00Z',
    stripe_checkout_session_id: 'cs_test_1',
    stripe_payment_intent_id: 'pi_test_1',
  },
  {
    id: 'donation-2',
    user_id: mockUser.id,
    amount_cents: 599,
    currency: 'usd',
    donation_type: 'nap',
    status: 'completed',
    created_at: '2025-01-19T11:00:00Z',
    stripe_checkout_session_id: 'cs_test_2',
    stripe_payment_intent_id: 'pi_test_2',
  },
];

describe('useDonation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = null;
    mockSelect.mockResolvedValue({ data: [], error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } },
    });
  });

  describe('initial state', () => {
    it('should return empty donations when not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.donations).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should fetch donations when authenticated', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: mockDonations, error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.donations).toHaveLength(2);
      expect(result.current.donations[0].id).toBe('donation-1');
      expect(result.current.donations[1].id).toBe('donation-2');
    });

    it('should handle fetch error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: null, error: { message: 'Fetch failed' } });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.donations).toEqual([]);
      expect(result.current.error).toBe('Fetch failed');
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('should expose donation items', () => {
      const { result } = renderHook(() => useDonation());

      expect(result.current.donationItems).toBe(DONATION_ITEMS);
      expect(result.current.donationItems).toHaveLength(4);
    });
  });

  describe('getInfo', () => {
    it('should calculate total donations correctly', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: mockDonations, error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const info = result.current.getInfo();

      // 99 + 599 = 698 cents = $6.98
      expect(info.totalCents).toBe(698);
      expect(info.totalFormatted).toBe('$6.98');
    });

    it('should calculate Pro status from donations', async () => {
      mockAuthUser = mockUser;
      // Total >= $29.99 (2999 cents)
      const proLevelDonations = [
        { ...mockDonations[0], amount_cents: 1499 },
        { ...mockDonations[1], amount_cents: 1500 },
      ];
      mockSelect.mockResolvedValue({ data: proLevelDonations, error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const info = result.current.getInfo();

      expect(info.totalCents).toBe(2999);
      expect(info.isProFromDonation).toBe(true);
      expect(info.remainingForPro).toBe(0);
      expect(info.progressPercent).toBe(100);
    });

    it('should calculate remaining for Pro correctly', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: mockDonations, error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const info = result.current.getInfo();

      // 698 cents, need 2999, remaining = 2301
      expect(info.remainingForPro).toBe(2301);
      expect(info.remainingForProFormatted).toBe('$23.01');
      expect(info.isProFromDonation).toBe(false);
    });

    it('should calculate progress percent correctly', async () => {
      mockAuthUser = mockUser;
      const halfwayDonations = [
        { ...mockDonations[0], amount_cents: 1500 }, // ~50% of 2999
      ];
      mockSelect.mockResolvedValue({ data: halfwayDonations, error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const info = result.current.getInfo();

      // 1500 / 2999 ≈ 50.02%
      expect(info.progressPercent).toBeCloseTo(50.02, 1);
    });

    it('should cap progress percent at 100', async () => {
      mockAuthUser = mockUser;
      const overProDonations = [
        { ...mockDonations[0], amount_cents: 3000 }, // Over threshold
      ];
      mockSelect.mockResolvedValue({ data: overProDonations, error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const info = result.current.getInfo();

      expect(info.progressPercent).toBe(100);
    });

    it('should return zero values when no donations', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const info = result.current.getInfo();

      expect(info.totalCents).toBe(0);
      expect(info.totalFormatted).toBe('$0.00');
      expect(info.donations).toHaveLength(0);
      expect(info.isProFromDonation).toBe(false);
      expect(info.remainingForPro).toBe(PRO_THRESHOLD_CENTS);
      expect(info.progressPercent).toBe(0);
    });
  });

  describe('createDonationCheckout', () => {
    it('should throw error when not authenticated', async () => {
      mockAuthUser = null;

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const donationItem = DONATION_ITEMS[0];

      await expect(
        act(async () => {
          await result.current.createDonationCheckout(donationItem);
        })
      ).rejects.toThrow('Must be logged in to donate');
    });

    it('should throw error when price ID is not configured', async () => {
      mockAuthUser = mockUser;

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const invalidItem = { ...DONATION_ITEMS[0], priceId: '' };

      await expect(
        act(async () => {
          await result.current.createDonationCheckout(invalidItem);
        })
      ).rejects.toThrow('Donation price not configured');
    });

    it('should throw error when no access token', async () => {
      mockAuthUser = mockUser;
      mockGetSession.mockResolvedValue({
        data: { session: null },
      });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const donationItem = { ...DONATION_ITEMS[0], priceId: 'price_test' };

      await expect(
        act(async () => {
          await result.current.createDonationCheckout(donationItem);
        })
      ).rejects.toThrow('No access token');
    });

    it('should call API and redirect on success', async () => {
      mockAuthUser = mockUser;
      const checkoutUrl = 'https://checkout.stripe.com/session/test';
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: checkoutUrl }),
      });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const donationItem = { ...DONATION_ITEMS[0], priceId: 'price_test_5min' };

      await act(async () => {
        await result.current.createDonationCheckout(donationItem);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/create-donation-checkout'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-access-token',
          }),
          body: expect.stringContaining('price_test_5min'),
        })
      );

      expect(mockLocationHref).toHaveBeenCalledWith(checkoutUrl);
    });

    it('should throw error on API failure', async () => {
      mockAuthUser = mockUser;
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Payment failed' }),
      });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const donationItem = { ...DONATION_ITEMS[0], priceId: 'price_test' };

      await expect(
        act(async () => {
          await result.current.createDonationCheckout(donationItem);
        })
      ).rejects.toThrow('Payment failed');
    });

    it('should send correct success and cancel URLs', async () => {
      mockAuthUser = mockUser;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ url: 'https://checkout.stripe.com/test' }),
      });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const donationItem = { ...DONATION_ITEMS[0], priceId: 'price_test' };

      await act(async () => {
        await result.current.createDonationCheckout(donationItem);
      });

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.successUrl).toBe('http://localhost:3000/settings?donation=success');
      expect(body.cancelUrl).toBe('http://localhost:3000/settings?donation=canceled');
      expect(body.donationType).toBe('break_5min');
    });
  });

  describe('realtime subscription', () => {
    it('should subscribe to donation changes on mount', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: [], error: null });

      renderHook(() => useDonation());

      await waitFor(() => {
        expect(mockChannel).toHaveBeenCalledWith('donation-changes');
      });

      expect(mockOn).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should add new completed donation on INSERT event', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Get the callback from mockOn
      const onCallback = (mockOn as Mock).mock.calls[0][2];

      // Simulate INSERT event with completed donation
      act(() => {
        onCallback({
          eventType: 'INSERT',
          new: {
            id: 'new-donation',
            user_id: mockUser.id,
            amount_cents: 299,
            status: 'completed',
            donation_type: 'break_15min',
            currency: 'usd',
            created_at: new Date().toISOString(),
          },
        });
      });

      expect(result.current.donations).toHaveLength(1);
      expect(result.current.donations[0].id).toBe('new-donation');
    });

    it('should not add pending donation on INSERT event', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const onCallback = (mockOn as Mock).mock.calls[0][2];

      act(() => {
        onCallback({
          eventType: 'INSERT',
          new: {
            id: 'pending-donation',
            user_id: mockUser.id,
            amount_cents: 299,
            status: 'pending', // Not completed
            donation_type: 'break_15min',
            currency: 'usd',
            created_at: new Date().toISOString(),
          },
        });
      });

      expect(result.current.donations).toHaveLength(0);
    });

    it('should update existing donation on UPDATE event', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: mockDonations, error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.donations).toHaveLength(2);
      });

      const onCallback = (mockOn as Mock).mock.calls[0][2];

      act(() => {
        onCallback({
          eventType: 'UPDATE',
          new: {
            ...mockDonations[0],
            amount_cents: 199, // Updated amount
          },
        });
      });

      expect(result.current.donations[0].amount_cents).toBe(199);
    });

    it('should add donation on UPDATE if it becomes completed and not in list', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const onCallback = (mockOn as Mock).mock.calls[0][2];

      // Simulate UPDATE event where pending becomes completed
      act(() => {
        onCallback({
          eventType: 'UPDATE',
          new: {
            id: 'newly-completed',
            user_id: mockUser.id,
            amount_cents: 599,
            status: 'completed',
            donation_type: 'nap',
            currency: 'usd',
            created_at: new Date().toISOString(),
          },
        });
      });

      expect(result.current.donations).toHaveLength(1);
      expect(result.current.donations[0].id).toBe('newly-completed');
    });

    it('should unsubscribe on unmount', async () => {
      mockAuthUser = mockUser;
      mockSelect.mockResolvedValue({ data: [], error: null });

      const { unmount } = renderHook(() => useDonation());

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockRemoveChannel).toHaveBeenCalled();
    });
  });

  describe('DONATION_ITEMS', () => {
    it('should have 4 donation items', () => {
      expect(DONATION_ITEMS).toHaveLength(4);
    });

    it('should have correct types', () => {
      const types = DONATION_ITEMS.map((item) => item.type);
      expect(types).toEqual(['break_5min', 'break_15min', 'nap', 'sleep']);
    });

    it('should have correct prices', () => {
      const prices = DONATION_ITEMS.map((item) => item.price);
      expect(prices).toEqual(['$0.99', '$2.99', '$5.99', '$9.99']);
    });

    it('should have all required fields', () => {
      DONATION_ITEMS.forEach((item) => {
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('nameJa');
        expect(item).toHaveProperty('nameEn');
        expect(item).toHaveProperty('descriptionJa');
        expect(item).toHaveProperty('descriptionEn');
        expect(item).toHaveProperty('price');
        expect(item).toHaveProperty('priceId');
      });
    });
  });

  describe('PRO_THRESHOLD_CENTS', () => {
    it('should be $29.99 in cents', () => {
      expect(PRO_THRESHOLD_CENTS).toBe(2999);
    });
  });
});

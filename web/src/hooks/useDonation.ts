import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Tables } from '../lib/database.types';

type Donation = Tables<'donations'>;

export type DonationType = 'break_5min' | 'break_15min' | 'nap' | 'sleep';

export interface DonationItem {
  type: DonationType;
  icon: string;
  nameJa: string;
  nameEn: string;
  descriptionJa: string;
  descriptionEn: string;
  price: string;
  priceId: string;
}

// Pro解放に必要な累計額（$29.99 = 2999 cents）
export const PRO_THRESHOLD_CENTS = 2999;

export const DONATION_ITEMS: DonationItem[] = [
  {
    type: 'break_5min',
    icon: '☕',
    nameJa: '5分休憩',
    nameEn: '5min Break',
    descriptionJa: 'ちょっと深呼吸してね',
    descriptionEn: 'Take a quick breather',
    price: '$0.99',
    priceId: import.meta.env.VITE_STRIPE_PRICE_DONATION_5MIN || '',
  },
  {
    type: 'break_15min',
    icon: '🍵',
    nameJa: '15分休憩',
    nameEn: '15min Break',
    descriptionJa: 'お茶でも飲んでゆっくり！',
    descriptionEn: 'Enjoy some tea and relax!',
    price: '$2.99',
    priceId: import.meta.env.VITE_STRIPE_PRICE_DONATION_15MIN || '',
  },
  {
    type: 'nap',
    icon: '😴',
    nameJa: '昼寝タイム',
    nameEn: 'Nap Time',
    descriptionJa: 'たまにはがっつり休んで',
    descriptionEn: 'Take a good rest sometimes',
    price: '$5.99',
    priceId: import.meta.env.VITE_STRIPE_PRICE_DONATION_NAP || '',
  },
  {
    type: 'sleep',
    icon: '🛏️',
    nameJa: 'ぐっすり睡眠',
    nameEn: 'Good Sleep',
    descriptionJa: '明日も頑張ってね',
    descriptionEn: 'Do your best tomorrow too',
    price: '$9.99',
    priceId: import.meta.env.VITE_STRIPE_PRICE_DONATION_SLEEP || '',
  },
];

export interface DonationInfo {
  totalCents: number;
  totalFormatted: string;
  donations: Donation[];
  isProFromDonation: boolean;
  remainingForPro: number;
  remainingForProFormatted: string;
  progressPercent: number;
}

export function useDonation() {
  const { user } = useAuth();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch donations on mount and when user changes
  useEffect(() => {
    if (!user) {
      setDonations([]);
      setLoading(false);
      return;
    }

    const fetchDonations = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch donations:', fetchError);
        setError(fetchError.message);
      } else {
        setDonations(data || []);
      }
      setLoading(false);
    };

    fetchDonations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('donation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newDonation = payload.new as Donation;
            if (newDonation.status === 'completed') {
              setDonations((prev) => [newDonation, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedDonation = payload.new as Donation;
            if (updatedDonation.status === 'completed') {
              setDonations((prev) => {
                const exists = prev.some((d) => d.id === updatedDonation.id);
                if (exists) {
                  return prev.map((d) =>
                    d.id === updatedDonation.id ? updatedDonation : d
                  );
                }
                return [updatedDonation, ...prev];
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Get donation info with computed properties
  const getInfo = useCallback((): DonationInfo => {
    const totalCents = donations.reduce((sum, d) => sum + d.amount_cents, 0);
    const remainingForPro = Math.max(0, PRO_THRESHOLD_CENTS - totalCents);
    const progressPercent = Math.min(100, (totalCents / PRO_THRESHOLD_CENTS) * 100);

    return {
      totalCents,
      totalFormatted: `$${(totalCents / 100).toFixed(2)}`,
      donations,
      isProFromDonation: totalCents >= PRO_THRESHOLD_CENTS,
      remainingForPro,
      remainingForProFormatted: `$${(remainingForPro / 100).toFixed(2)}`,
      progressPercent,
    };
  }, [donations]);

  // Create donation checkout session and redirect
  const createDonationCheckout = useCallback(
    async (item: DonationItem): Promise<void> => {
      if (!user) {
        throw new Error('Must be logged in to donate');
      }

      if (!item.priceId) {
        throw new Error('Donation price not configured');
      }

      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('No access token');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-donation-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            priceId: item.priceId,
            donationType: item.type,
            successUrl: `${window.location.origin}/settings?donation=success`,
            cancelUrl: `${window.location.origin}/settings?donation=canceled`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create donation checkout');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    [user]
  );

  return {
    donations,
    loading,
    error,
    getInfo,
    createDonationCheckout,
    donationItems: DONATION_ITEMS,
  };
}

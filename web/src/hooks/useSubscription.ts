import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { Tables } from '../lib/database.types';

type Subscription = Tables<'subscriptions'>;

export type SubscriptionStatus = 'free' | 'active' | 'canceled' | 'past_due' | 'trialing';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  isPro: boolean;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  // Card-less trial info
  isTrialing: boolean;
  trialEndsAt: Date | null;
  trialDaysRemaining: number | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription on mount and when user changes
  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // PGRST116 = no rows returned (new user without subscription row yet)
        if (fetchError.code === 'PGRST116') {
          setSubscription(null);
        } else {
          console.error('Failed to fetch subscription:', fetchError);
          setError(fetchError.message);
        }
      } else {
        setSubscription(data);
      }
      setLoading(false);
    };

    fetchSubscription();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setSubscription(payload.new as Subscription);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Get subscription info with computed properties
  const getInfo = useCallback((): SubscriptionInfo => {
    if (!subscription) {
      return {
        status: 'free',
        isPro: false,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        isTrialing: false,
        trialEndsAt: null,
        trialDaysRemaining: null,
      };
    }

    const now = new Date();

    // Check card-less trial
    const trialEndsAt = subscription.trial_ends_at
      ? new Date(subscription.trial_ends_at)
      : null;
    const isCardlessTrial = Boolean(
      subscription.status === 'trialing' &&
      trialEndsAt &&
      trialEndsAt > now
    );

    // Calculate trial days remaining
    let trialDaysRemaining: number | null = null;
    if (isCardlessTrial && trialEndsAt) {
      trialDaysRemaining = Math.ceil(
        (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Check paid subscription
    const isPaidActive =
      subscription.status === 'active' &&
      (!subscription.current_period_end ||
        new Date(subscription.current_period_end) > now);

    const isPro = isCardlessTrial || isPaidActive;

    return {
      status: subscription.status,
      isPro,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      stripeCustomerId: subscription.stripe_customer_id,
      isTrialing: isCardlessTrial,
      trialEndsAt,
      trialDaysRemaining,
    };
  }, [subscription]);

  // Create checkout session and redirect
  const createCheckout = useCallback(
    async (priceId: string): Promise<void> => {
      if (!user) {
        throw new Error('Must be logged in to upgrade');
      }

      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error('No access token');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            priceId,
            successUrl: `${window.location.origin}/settings?success=true`,
            cancelUrl: `${window.location.origin}/settings?canceled=true`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    },
    [user]
  );

  // Open customer portal
  const openPortal = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error('Must be logged in');
    }

    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      throw new Error('No access token');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-portal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/settings`,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create portal session');
    }

    // Redirect to Stripe Customer Portal
    window.location.href = data.url;
  }, [user]);

  // Check if a feature is available
  const hasFeature = useCallback(
    (_feature: 'pro_icons' | 'all_colors' | 'csv_export' | 'ad_free'): boolean => {
      const info = getInfo();
      return info.isPro;
    },
    [getInfo]
  );

  return {
    subscription,
    loading,
    error,
    getInfo,
    createCheckout,
    openPortal,
    hasFeature,
    isPro: getInfo().isPro,
  };
}

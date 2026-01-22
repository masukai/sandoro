-- ==========================================
-- sandoro - Donations Schema
-- 「開発者に休憩を奢る」機能
-- ==========================================

-- ==========================================
-- Donations table
-- ==========================================
CREATE TABLE public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_checkout_session_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    donation_type TEXT NOT NULL CHECK (donation_type IN ('break_5min', 'break_15min', 'nap', 'sleep')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_donations_user ON public.donations(user_id);
CREATE INDEX idx_donations_stripe_session ON public.donations(stripe_checkout_session_id);

-- RLS Policy: Users can only view their own donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own donations"
    ON public.donations FOR SELECT
    USING (auth.uid() = user_id);

-- Insert は Edge Function (service_role) のみ許可

-- ==========================================
-- Helper function to get total donation amount
-- Returns total in cents
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_total_donations(check_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(amount_cents) FROM public.donations
         WHERE user_id = check_user_id AND status = 'completed'),
        0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Update is_pro_user to include donation threshold
-- $29.99 = 2999 cents
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_pro_user(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE user_id = check_user_id
        AND (
            -- Paid subscription (active or Stripe trialing)
            (status = 'active' AND (current_period_end IS NULL OR current_period_end > NOW()))
            OR
            -- Card-less trial (status = trialing with trial_ends_at)
            (status = 'trialing' AND trial_ends_at IS NOT NULL AND trial_ends_at > NOW())
        )
    )
    OR
    -- Donation threshold reached ($29.99 = 2999 cents)
    public.get_total_donations(check_user_id) >= 2999;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

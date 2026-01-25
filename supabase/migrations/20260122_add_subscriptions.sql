-- ==========================================
-- sandoro - Subscriptions Schema (Stripe)
-- ==========================================

-- ==========================================
-- Subscriptions table
-- ==========================================
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'active', 'canceled', 'past_due', 'trialing')),
    price_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    -- Card-less trial support
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for Stripe lookups
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id);

-- RLS Policy: Users can only view their own subscription
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Insert/Update は Edge Function (service_role) のみ許可
-- ユーザーからの直接操作は禁止

-- ==========================================
-- Update trigger to handle new users
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);

    INSERT INTO public.goals (user_id)
    VALUES (NEW.id);

    -- Start 7-day card-less trial for new users
    INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
    VALUES (NEW.id, 'trialing', NOW() + INTERVAL '7 days');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Trigger already exists from init_schema, this replaces the function

-- ==========================================
-- Helper function to check Pro status
-- Handles both paid subscriptions and card-less trials
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
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

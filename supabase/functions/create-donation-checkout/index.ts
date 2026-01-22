// Supabase Edge Function: Create Stripe Checkout Session for Donations
// 「開発者に休憩を奢る」機能
// Deno Deploy runtime

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Donation type to amount mapping (in cents)
const DONATION_AMOUNTS: Record<string, { cents: number; name: string }> = {
  break_5min: { cents: 99, name: '5分休憩' },
  break_15min: { cents: 299, name: '15分休憩' },
  nap: { cents: 599, name: '昼寝タイム' },
  sleep: { cents: 999, name: 'ぐっすり睡眠' },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get request body
    const { priceId, donationType, successUrl, cancelUrl } = await req.json();

    if (!priceId || !donationType) {
      return new Response(JSON.stringify({ error: 'Price ID and donation type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate donation type
    if (!DONATION_AMOUNTS[donationType]) {
      return new Response(JSON.stringify({ error: 'Invalid donation type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already has a Stripe customer
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let customerId = subscription?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to subscriptions table
      await supabaseAdmin
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    // Create checkout session for one-time payment (donation)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment for donations
      success_url: successUrl || `${req.headers.get('origin')}/settings?donation=success`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/settings?donation=canceled`,
      metadata: {
        supabase_user_id: user.id,
        donation_type: donationType,
        is_donation: 'true',
      },
      payment_intent_data: {
        metadata: {
          supabase_user_id: user.id,
          donation_type: donationType,
          is_donation: 'true',
        },
      },
    });

    // Create pending donation record
    await supabaseAdmin.from('donations').insert({
      user_id: user.id,
      stripe_checkout_session_id: session.id,
      amount_cents: DONATION_AMOUNTS[donationType].cents,
      currency: 'usd',
      donation_type: donationType,
      status: 'pending',
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

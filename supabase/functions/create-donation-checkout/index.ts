// Supabase Edge Function: Create Stripe Checkout Session for Donations
// 「開発者に休憩を奢る」機能
// Deno Deploy runtime

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno&deno-std=0.177.0';

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

// Decode JWT payload without verification (verification is done by Supabase)
function decodeJwtPayload(token: string): { sub: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Missing Stripe key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!serviceRoleKey || !supabaseUrl) {
      return new Response(JSON.stringify({ error: 'Missing Supabase config' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract and decode JWT
    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = decodeJwtPayload(token);

    if (!jwtPayload || !jwtPayload.sub) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = jwtPayload.sub;
    const userEmail = jwtPayload.email;

    // Get request body
    const { priceId, donationType, successUrl, cancelUrl } = await req.json();

    if (!priceId || !donationType) {
      return new Response(JSON.stringify({ error: 'Price ID and donation type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!DONATION_AMOUNTS[donationType]) {
      return new Response(JSON.stringify({ error: 'Invalid donation type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Initialize admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get or create Stripe customer
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          status: 'free',
        }, { onConflict: 'user_id' });
    }

    // Create checkout session
    const origin = req.headers.get('origin') || 'https://sandoro.app';
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'payment',
      success_url: successUrl || `${origin}/?donation=success`,
      cancel_url: cancelUrl || `${origin}/?donation=canceled`,
      metadata: {
        supabase_user_id: userId,
        donation_type: donationType,
        is_donation: 'true',
      },
      payment_intent_data: {
        metadata: {
          supabase_user_id: userId,
          donation_type: donationType,
          is_donation: 'true',
        },
      },
    });

    // Create pending donation record
    const { error: insertError } = await supabaseAdmin.from('donations').insert({
      user_id: userId,
      stripe_checkout_session_id: session.id,
      amount_cents: DONATION_AMOUNTS[donationType].cents,
      currency: 'usd',
      donation_type: donationType,
      status: 'pending',
    });

    if (insertError) {
      console.error('Failed to create donation record:', insertError);
      // Continue anyway - webhook can still process the payment
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

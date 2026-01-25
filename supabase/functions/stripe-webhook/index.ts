// Supabase Edge Function: Stripe Webhook Handler
// Deno Deploy runtime

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno&deno-std=0.177.0';

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get the signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response('No signature', { status: 400 });
    }

    // Get raw body
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
        undefined,
        cryptoProvider
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Check if this is a donation
        if (session.metadata?.is_donation === 'true') {
          // Handle donation payment
          const userId = session.metadata.supabase_user_id;
          const donationType = session.metadata.donation_type;

          if (userId && donationType) {
            // Update donation record to completed
            const { data: updateData, error: updateError } = await supabaseAdmin
              .from('donations')
              .update({
                status: 'completed',
                stripe_payment_intent_id: session.payment_intent as string,
              })
              .eq('stripe_checkout_session_id', session.id)
              .select();

            if (updateError) {
              console.error(`Failed to update donation: ${updateError.message}`);
            } else if (!updateData || updateData.length === 0) {
              console.error(`No donation found for session: ${session.id}`);
              // Try to insert the donation record if it doesn't exist
              const amountCents = session.amount_total || 0;
              const { error: insertError } = await supabaseAdmin
                .from('donations')
                .insert({
                  user_id: userId,
                  stripe_checkout_session_id: session.id,
                  stripe_payment_intent_id: session.payment_intent as string,
                  amount_cents: amountCents,
                  currency: session.currency || 'usd',
                  donation_type: donationType,
                  status: 'completed',
                });
              if (insertError) {
                console.error(`Failed to insert donation: ${insertError.message}`);
              } else {
                console.log(`Donation inserted: user=${userId}, type=${donationType}, amount=${amountCents}`);
              }
            } else {
              console.log(`Donation updated: user=${userId}, type=${donationType}`);
            }
          }
          break;
        }

        // Handle subscription checkout
        const userId = session.subscription
          ? (await stripe.subscriptions.retrieve(session.subscription as string))
              .metadata.supabase_user_id
          : session.metadata?.supabase_user_id;

        if (userId && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await supabaseAdmin
            .from('subscriptions')
            .update({
              stripe_subscription_id: subscription.id,
              status: 'active',
              price_id: subscription.items.data[0]?.price.id,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;

        if (userId) {
          const status =
            subscription.status === 'active'
              ? 'active'
              : subscription.status === 'trialing'
              ? 'trialing'
              : subscription.status === 'past_due'
              ? 'past_due'
              : 'canceled';

          await supabaseAdmin
            .from('subscriptions')
            .update({
              status,
              price_id: subscription.items.data[0]?.price.id,
              current_period_start: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              current_period_end: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.supabase_user_id;

        if (userId) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'canceled',
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          const userId = subscription.metadata.supabase_user_id;

          if (userId) {
            await supabaseAdmin
              .from('subscriptions')
              .update({
                status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

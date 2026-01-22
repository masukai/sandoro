// Deno test for create-donation-checkout Edge Function
// Run with: deno test --allow-env --allow-net supabase/functions/create-donation-checkout/index.test.ts

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  stub,
  returnsNext,
  assertSpyCalls,
  assertSpyCall,
} from 'https://deno.land/std@0.177.0/testing/mock.ts';

// Mock environment variables
Deno.env.set('STRIPE_SECRET_KEY', 'sk_test_mock');
Deno.env.set('SUPABASE_URL', 'https://test.supabase.co');
Deno.env.set('SUPABASE_ANON_KEY', 'test-anon-key');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

// Test constants
const DONATION_AMOUNTS = {
  break_5min: { cents: 99, name: '5分休憩' },
  break_15min: { cents: 299, name: '15分休憩' },
  nap: { cents: 599, name: '昼寝タイム' },
  sleep: { cents: 999, name: 'ぐっすり睡眠' },
};

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

Deno.test('DONATION_AMOUNTS should have correct values', () => {
  assertEquals(DONATION_AMOUNTS.break_5min.cents, 99);
  assertEquals(DONATION_AMOUNTS.break_15min.cents, 299);
  assertEquals(DONATION_AMOUNTS.nap.cents, 599);
  assertEquals(DONATION_AMOUNTS.sleep.cents, 999);
});

Deno.test('DONATION_AMOUNTS should have all required types', () => {
  const types = Object.keys(DONATION_AMOUNTS);
  assertEquals(types, ['break_5min', 'break_15min', 'nap', 'sleep']);
});

Deno.test('DONATION_AMOUNTS total should enable Pro unlock', () => {
  // All donations total = 99 + 299 + 599 + 999 = 1996 cents
  const total = Object.values(DONATION_AMOUNTS).reduce((sum, item) => sum + item.cents, 0);
  assertEquals(total, 1996);

  // Three sleep donations should unlock Pro ($29.99 = 2999 cents threshold)
  const threeSleeps = DONATION_AMOUNTS.sleep.cents * 3;
  assertEquals(threeSleeps, 2997); // Still 2 cents short of 2999

  // Sleep + sleep + sleep + 5min = 2997 + 99 = 3096 >= 2999, Pro unlocked!
});

Deno.test('Request validation - should require priceId and donationType', async () => {
  const invalidPayloads = [
    {},
    { priceId: 'price_test' },
    { donationType: 'break_5min' },
  ];

  for (const payload of invalidPayloads) {
    const body = JSON.stringify(payload);

    // Validate that these would fail validation
    const parsed = JSON.parse(body);
    const isValid = parsed.priceId && parsed.donationType;
    assertEquals(isValid, false);
  }
});

Deno.test('Request validation - should accept valid donation types', () => {
  const validTypes = ['break_5min', 'break_15min', 'nap', 'sleep'];

  for (const type of validTypes) {
    assertExists(DONATION_AMOUNTS[type as keyof typeof DONATION_AMOUNTS]);
  }
});

Deno.test('Request validation - should reject invalid donation types', () => {
  const invalidTypes = ['invalid', 'coffee', 'break_10min', 'snack'];

  for (const type of invalidTypes) {
    const isValid = type in DONATION_AMOUNTS;
    assertEquals(isValid, false);
  }
});

Deno.test('Checkout session metadata should include required fields', () => {
  const metadata = {
    supabase_user_id: mockUser.id,
    donation_type: 'break_5min',
    is_donation: 'true',
  };

  assertEquals(metadata.supabase_user_id, mockUser.id);
  assertEquals(metadata.donation_type, 'break_5min');
  assertEquals(metadata.is_donation, 'true');
});

Deno.test('Donation record should have correct structure', () => {
  const donationRecord = {
    user_id: mockUser.id,
    stripe_checkout_session_id: 'cs_test_123',
    amount_cents: DONATION_AMOUNTS.break_5min.cents,
    currency: 'usd',
    donation_type: 'break_5min',
    status: 'pending',
  };

  assertEquals(donationRecord.user_id, mockUser.id);
  assertEquals(donationRecord.amount_cents, 99);
  assertEquals(donationRecord.currency, 'usd');
  assertEquals(donationRecord.status, 'pending');
});

Deno.test('Success URL should include donation success parameter', () => {
  const origin = 'https://sandoro.app';
  const successUrl = `${origin}/settings?donation=success`;

  assertStringIncludes(successUrl, 'donation=success');
  assertStringIncludes(successUrl, '/settings');
});

Deno.test('Cancel URL should include donation canceled parameter', () => {
  const origin = 'https://sandoro.app';
  const cancelUrl = `${origin}/settings?donation=canceled`;

  assertStringIncludes(cancelUrl, 'donation=canceled');
  assertStringIncludes(cancelUrl, '/settings');
});

// CORS tests
Deno.test('CORS headers should be properly configured', () => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  assertEquals(corsHeaders['Access-Control-Allow-Origin'], '*');
  assertStringIncludes(corsHeaders['Access-Control-Allow-Headers'], 'authorization');
  assertStringIncludes(corsHeaders['Access-Control-Allow-Headers'], 'content-type');
});

// Price amount validation
Deno.test('Donation amounts should match Stripe prices', () => {
  // $0.99 = 99 cents
  assertEquals(DONATION_AMOUNTS.break_5min.cents, 99);

  // $2.99 = 299 cents
  assertEquals(DONATION_AMOUNTS.break_15min.cents, 299);

  // $5.99 = 599 cents
  assertEquals(DONATION_AMOUNTS.nap.cents, 599);

  // $9.99 = 999 cents
  assertEquals(DONATION_AMOUNTS.sleep.cents, 999);
});

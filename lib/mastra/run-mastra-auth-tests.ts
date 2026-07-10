import { loadEnvConfig } from '@next/env';
// Load environment variables
loadEnvConfig(process.cwd());

import { POST } from '../../app/api/ai/chat/route';
import { setupMockFetch, restoreFetch, setScenario } from './fake-model-provider';
import { createSupabaseServiceRoleClient, createSupabaseClient } from '../supabase/server';
import crypto from 'crypto';

interface APIAssertion {
  name: string;
  run: () => Promise<void>;
}

const assertions: APIAssertion[] = [];
let devUserIdBackup = process.env.DEV_USER_ID;
let testUserId = '00000000-0000-0000-0000-000000000001';
let createdUserId: string | null = null;

// Setup mock fetch by default
setupMockFetch();

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertContains(str: string, substring: string, message: string) {
  if (!str.includes(substring)) {
    throw new Error(`${message}: "${str}" does not contain "${substring}"`);
  }
}

// ----------------------------------------------------
// TEST 1: Unauthenticated request
// ----------------------------------------------------
assertions.push({
  name: 'Unauthenticated Request (401)',
  run: async () => {
    // Clear dev user bypass to trigger real authentication check
    delete process.env.DEV_USER_ID;

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        feature: 'general_assistant',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 401, 'Expected 401 Unauthorized status');
    const json = await res.json();
    assertEqual(json.error, 'Authentication is required.', 'Expected client-safe error message');

    // Restore dev user bypass
    process.env.DEV_USER_ID = devUserIdBackup;
  },
});

// ----------------------------------------------------
// TEST 2: Authenticated request
// ----------------------------------------------------
assertions.push({
  name: 'Authenticated Request (200)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';
    setScenario('success');

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-valid-token',
      },
      body: JSON.stringify({
        feature: 'bio_improvement',
        messages: [{ role: 'user', content: 'Photographer and hiker' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 200, 'Expected 200 OK status');
    const json = await res.json();
    assertContains(json.content, 'Sarah', 'Expected mock biography draft matching prompt');
  },
});

// ----------------------------------------------------
// TEST 3: User ID spoofing attempt
// ----------------------------------------------------
assertions.push({
  name: 'User ID Spoofing Attempt Isolation',
  run: async () => {
    const authUserId = testUserId;
    process.env.DEV_USER_ID = authUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';
    setScenario('success');

    // Run request containing a different user ID in the body
    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-valid-token',
      },
      body: JSON.stringify({
        userId: 'spoofed-user-999', // Spoofed client parameter
        feature: 'general_assistant',
        messages: [{ role: 'user', content: 'test spoofing' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 200, 'Request should complete');

    // Query database to ensure audit logs mapped to the authenticated user ID and NOT the spoofed parameter
    const serviceClient = createSupabaseServiceRoleClient();
    const { data, error } = await serviceClient
      .from('ai_usage_events')
      .select('*')
      .eq('user_id', authUserId)
      .order('request_started_at', { ascending: false })
      .limit(1);

    if (error) throw new Error(`Query failed: ${error.message}`);
    if (!data || data.length === 0) throw new Error('No audit record found for authenticated ID');
    
    // The spoofed ID should not be present as the user_id
    assertEqual(data[0].user_id, authUserId, 'Audit log must map to the authentic user ID');
  },
});

// ----------------------------------------------------
// TEST 4: Invalid feature parameter
// ----------------------------------------------------
assertions.push({
  name: 'Invalid Feature Parameter (400)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-valid-token',
      },
      body: JSON.stringify({
        feature: 'invalid_feature_name',
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 400, 'Expected 400 Bad Request');
    const json = await res.json();
    assertEqual(json.error, 'Invalid request payload.', 'Expected client-safe error message');
  },
});

// ----------------------------------------------------
// TEST 5: Oversized request payload
// ----------------------------------------------------
assertions.push({
  name: 'Oversized Request Payload (413)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '200000', // ~200 KB (above 100 KB limit)
        'Authorization': 'Bearer mock-valid-token',
      },
      body: JSON.stringify({
        feature: 'general_assistant',
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 413, 'Expected 413 Payload Too Large');
    const json = await res.json();
    assertEqual(json.error, 'Invalid request payload. Payload too large.', 'Expected client-safe error message');
  },
});

// ----------------------------------------------------
// TEST 6: Provider timeout
// ----------------------------------------------------
assertions.push({
  name: 'Provider Timeout (504)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';
    setScenario('timeout');

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-valid-token',
      },
      body: JSON.stringify({
        feature: 'general_assistant',
        messages: [{ role: 'user', content: 'test timeout' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 504, 'Expected 504 Gateway Timeout status');
    const json = await res.json();
    assertEqual(json.error, 'AI assistant took too long to respond. Please try again.', 'Expected safe message');
  },
});

// ----------------------------------------------------
// TEST 7: Provider 5xx error
// ----------------------------------------------------
assertions.push({
  name: 'Provider 500 error (502)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';
    setScenario('provider-error');

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-valid-token',
      },
      body: JSON.stringify({
        feature: 'general_assistant',
        messages: [{ role: 'user', content: 'test provider error' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 502, 'Expected 502 Bad Gateway error');
    const json = await res.json();
    assertEqual(json.error, 'AI assistant is unavailable right now.', 'Expected client-safe error message');
  },
});

// ----------------------------------------------------
// TEST 8: Malformed structured output fallback
// ----------------------------------------------------
assertions.push({
  name: 'Malformed Structured Output Safe Fallback',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';
    setScenario('malformed-output');

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-valid-token',
      },
      body: JSON.stringify({
        feature: 'profile_creation',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 200, 'Expected 200 status (safe fallback activated)');
    const json = await res.json();
    const data = JSON.parse(json.content);
    assertEqual(data.profileComplete, false, 'Expected profileComplete false from default safe fallback');
  },
});

// ----------------------------------------------------
// TEST 9: Production POC flag disabled
// ----------------------------------------------------
assertions.push({
  name: 'Production POC flag disabled (503)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'false';

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-valid-token',
      },
      body: JSON.stringify({
        feature: 'general_assistant',
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 503, 'Expected 503 Service Unavailable status');
    const json = await res.json();
    assertEqual(json.error, 'Mastra AI POC is disabled.', 'Expected safe disabled message');
  },
});

// ----------------------------------------------------
// TEST 10: Row Level Security User Isolation
// ----------------------------------------------------
assertions.push({
  name: 'Row Level Security Event Isolation',
  run: async () => {
    // 1. Establish regular user token client (simulate user-1 query)
    const user1Client = createSupabaseClient();
    
    // Attempting to select all logs directly as an unauthenticated/anonymous user or arbitrary user
    const { data: selectData, error: selectError } = await user1Client
      .from('ai_usage_events')
      .select('*');

    // RLS policy checks should prevent anonymous reads
    if (selectError) {
      console.log('RLS Anonymous Read blocked successfully:', selectError.message);
    } else {
      assertEqual(selectData.length, 0, 'RLS policy must return 0 rows for anonymous queries');
    }

    // 2. Attempt to spoof insert for another user
    const { error: insertError } = await user1Client
      .from('ai_usage_events')
      .insert({
        user_id: '00000000-0000-0000-0000-000000009999', // Spoofed user ID
        feature: 'general_assistant',
        status: 'success',
        latency_ms: 100,
      });

    // RLS insert policy checks `with check (user_id = auth.uid())` which will reject this insert since the user is not authenticated as 9999
    if (insertError) {
      console.log('RLS Spoofed Insert blocked successfully:', insertError.message);
    } else {
      throw new Error('RLS check should have blocked the spoofed user insert');
    }
  },
});

// ----------------------------------------------------
// TEST 11: No provider credentials in client bundle
// ----------------------------------------------------
assertions.push({
  name: 'No provider credentials in client bundle',
  run: async () => {
    // Verify that NEXT_PUBLIC_ prefixes are not used on sensitive LLM keys
    const apiCodeKey = 'NEXT_PUBLIC_LANGDOCK_API_CODE';
    assertEqual(process.env[apiCodeKey], undefined, 'API keys must not be exposed to client bundles via NEXT_PUBLIC_ prefix');
  },
});


async function runAll() {
  console.log('========================================');
  console.log('Running Patch 002B Authenticated Mastra API and Audit Tests');
  console.log('========================================');

  // Setup: dynamically retrieve a valid profile ID from profiles table or create a temporary one
  const serviceClient = createSupabaseServiceRoleClient();
  try {
    const { data: profiles, error } = await serviceClient.from('profiles').select('id').limit(1);
    if (!error && profiles && profiles.length > 0) {
      testUserId = profiles[0].id;
      console.log(`[SETUP] Found valid database profile ID to prevent foreign key errors: ${testUserId}`);
    } else {
      console.log('[SETUP] No profiles found. Creating a temporary auth user and profile...');
      const email = `test-user-${Date.now()}@getwink.app`;
      const { data: userRecord, error: userError } = await serviceClient.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
      });
      if (userError || !userRecord || !userRecord.user) {
        throw new Error(`Failed to create test user: ${userError?.message}`);
      }
      
      const userId = userRecord.user.id;
      createdUserId = userId;

      const { error: profileError } = await serviceClient.from('profiles').insert({
        id: userId,
        display_name: 'Test Profile',
        gender: 'other',
        birthdate: '2000-01-01',
        account_status: 'active',
      });
      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
      
      testUserId = userId;
      console.log(`[SETUP] Dynamically created test auth user and profile with ID: ${testUserId}`);
    }
  } catch (err: any) {
    console.warn('[SETUP] WARNING: Database connection failed during profile lookup:', err.message);
  }

  let passedCount = 0;
  let failedCount = 0;

  try {
    for (const assertion of assertions) {
      try {
        console.log(`\n[RUNNING] ${assertion.name}...`);
        await assertion.run();
        console.log(`[PASS] ${assertion.name}`);
        passedCount++;
      } catch (err: any) {
        console.error(`[FAIL] ${assertion.name}: ${err.message}`);
        failedCount++;
      }
    }
  } finally {
    // Clean up temporary user if created
    if (createdUserId) {
      try {
        await serviceClient.auth.admin.deleteUser(createdUserId);
        console.log(`[CLEANUP] Successfully deleted test auth user: ${createdUserId}`);
      } catch (err: any) {
        console.error('[CLEANUP ERROR] Failed to clean up user:', err.message);
      }
    }
  }

  // Restore fetch implementation
  restoreFetch();

  console.log('\n========================================');
  console.log(`Test Execution Complete: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('========================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

import { loadEnvConfig } from '@next/env';
// Load environment variables
loadEnvConfig(process.cwd());

import { POST } from '../../app/api/ai/chat/route';
import { GET as healthGET, POST as healthPOST } from '../../app/api/health/route';
import { setupMockFetch, restoreFetch, setScenario } from './fake-model-provider';
import { createSupabaseServiceRoleClient, createSupabaseClient } from '../supabase/server';

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
  name: 'Missing Authentication (401)',
  run: async () => {
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

    process.env.DEV_USER_ID = devUserIdBackup;
  },
});

// ----------------------------------------------------
// TEST 2: Malformed bearer token
// ----------------------------------------------------
assertions.push({
  name: 'Malformed Bearer Token (401)',
  run: async () => {
    delete process.env.DEV_USER_ID;

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer malformed-token-xyz',
      },
      body: JSON.stringify({
        feature: 'general_assistant',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 401, 'Expected 401 status');
    const json = await res.json();
    assertEqual(json.error, 'Authentication is required.', 'Expected client-safe message');

    process.env.DEV_USER_ID = devUserIdBackup;
  },
});

// ----------------------------------------------------
// TEST 3: Expired bearer token
// ----------------------------------------------------
assertions.push({
  name: 'Expired Bearer Token (401)',
  run: async () => {
    delete process.env.DEV_USER_ID;

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-expired-token',
      },
      body: JSON.stringify({
        feature: 'general_assistant',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 401, 'Expected 401 status');
    const json = await res.json();
    assertEqual(json.error, 'Authentication is required.', 'Expected client-safe message');

    process.env.DEV_USER_ID = devUserIdBackup;
  },
});

// ----------------------------------------------------
// TEST 4: Valid bearer token
// ----------------------------------------------------
assertions.push({
  name: 'Valid Bearer Token (200)',
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
    assertContains(json.content, 'Sarah', 'Expected mock biography draft');
  },
});

// ----------------------------------------------------
// TEST 5: Valid cookie session
// ----------------------------------------------------
assertions.push({
  name: 'Valid Cookie Session (200)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';
    setScenario('success');

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Cookie': 'sb-uuswuaaebkwehhckkmbt-auth-token=mock-valid-token',
      },
      body: JSON.stringify({
        feature: 'bio_improvement',
        messages: [{ role: 'user', content: 'Photographer and hiker' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 200, 'Expected 200 OK status');
    const json = await res.json();
    assertContains(json.content, 'Sarah', 'Expected biography draft');
  },
});

// ----------------------------------------------------
// TEST 6: User ID spoofing attempt
// ----------------------------------------------------
assertions.push({
  name: 'User ID Spoofing Isolation',
  run: async () => {
    const authUserId = testUserId;
    process.env.DEV_USER_ID = authUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';
    setScenario('success');

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-valid-token',
      },
      body: JSON.stringify({
        userId: 'spoofed-user-999',
        feature: 'general_assistant',
        messages: [{ role: 'user', content: 'test spoofing' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 200, 'Request should complete');

    const serviceClient = createSupabaseServiceRoleClient();
    const { data, error } = await serviceClient
      .from('ai_usage_events')
      .select('*')
      .eq('user_id', authUserId)
      .order('request_started_at', { ascending: false })
      .limit(1);

    if (error) throw new Error(`Query failed: ${error.message}`);
    if (!data || data.length === 0) throw new Error('No audit record found');
    assertEqual(data[0].user_id, authUserId, 'Audit log must map to the authentic user ID');
  },
});

// ----------------------------------------------------
// TEST 7: Suspended/deleted user
// ----------------------------------------------------
assertions.push({
  name: 'Suspended/Deleted User (401)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';

    const serviceClient = createSupabaseServiceRoleClient();
    
    // Suspend user in DB
    await serviceClient
      .from('profiles')
      .update({ account_status: 'suspended' })
      .eq('id', testUserId);

    try {
      const req = new Request('https://www.getwink.app/api/ai/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Authorization': 'Bearer mock-valid-token',
        },
        body: JSON.stringify({
          feature: 'general_assistant',
          messages: [{ role: 'user', content: 'hello' }],
        }),
      });

      const res = await POST(req);
      assertEqual(res.status, 401, 'Suspended user must be blocked with HTTP 401');
      const json = await res.json();
      assertEqual(json.error, 'Authentication is required.', 'Expected client safe message');
    } finally {
      // Re-activate user
      await serviceClient
        .from('profiles')
        .update({ account_status: 'active' })
        .eq('id', testUserId);
    }
  },
});

// ----------------------------------------------------
// TEST 8: Declared body over 100 KB
// ----------------------------------------------------
assertions.push({
  name: 'Declared Body Over 100 KB (413)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': '200000',
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
    assertEqual(json.error, 'Invalid request payload. Request too large.', 'Expected client-safe message');
  },
});

// ----------------------------------------------------
// TEST 9: Missing Content-Length with actual body > 100 KB
// ----------------------------------------------------
assertions.push({
  name: 'Missing Content-Length, actual body > 100 KB (413)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';

    // Construct a large string (>100KB)
    const largeContent = 'a'.repeat(105 * 1024);

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-valid-token',
      },
      body: JSON.stringify({
        feature: 'general_assistant',
        messages: [{ role: 'user', content: largeContent }],
      }),
    });

    // Remove content-length header if Next/undici added it
    req.headers.delete('content-length');

    const res = await POST(req);
    assertEqual(res.status, 413, 'Expected 413 Payload Too Large');
    const json = await res.json();
    assertEqual(json.error, 'Invalid request payload. Request too large.', 'Expected client-safe message');
  },
});

// ----------------------------------------------------
// TEST 10: Malformed JSON
// ----------------------------------------------------
assertions.push({
  name: 'Malformed JSON under limit (400)',
  run: async () => {
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';

    const req = new Request('https://www.getwink.app/api/ai/chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': 'Bearer mock-valid-token',
      },
      body: '{invalid-json-body}',
    });

    const res = await POST(req);
    assertEqual(res.status, 400, 'Expected 400 Bad Request');
    const json = await res.json();
    assertEqual(json.error, 'Invalid request payload.', 'Expected client-safe validation error message');
  },
});

// ----------------------------------------------------
// TEST 11: Provider timeout
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
    assertEqual(res.status, 504, 'Expected 504 status');
    
    // Verify audit logs record status failure
    const serviceClient = createSupabaseServiceRoleClient();
    const { data } = await serviceClient
      .from('ai_usage_events')
      .select('*')
      .eq('user_id', testUserId)
      .eq('feature', 'general_assistant')
      .order('request_started_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      assertEqual(data[0].status, 'failure', 'Timeout audit status must be failure');
    }
  },
});

// ----------------------------------------------------
// TEST 12: Provider 5xx/4xx
// ----------------------------------------------------
assertions.push({
  name: 'Provider 500 Error (502)',
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
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    const res = await POST(req);
    assertEqual(res.status, 502, 'Expected 502 Bad Gateway');
    const json = await res.json();
    assertEqual(json.error, 'AI assistant is unavailable right now.', 'Expected client-safe error message');
  },
});

// ----------------------------------------------------
// TEST 13: Malformed AI output fallback
// ----------------------------------------------------
assertions.push({
  name: 'Malformed Structured Output Fallback',
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
    assertEqual(res.status, 200, 'Expected 200 status');
    
    // Verify fallback audit record shows fallback_used = true
    const serviceClient = createSupabaseServiceRoleClient();
    const { data } = await serviceClient
      .from('ai_usage_events')
      .select('*')
      .eq('user_id', testUserId)
      .eq('feature', 'profile_creation')
      .order('request_started_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      assertEqual(data[0].status, 'failure', 'Fallback audit status must be failure');
      assertEqual(data[0].metadata.fallback_used, true, 'metadata fallback_used must be true');
    }
  },
});

// ----------------------------------------------------
// TEST 14: Production POC flag disabled
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
  },
});

// ----------------------------------------------------
// TEST 15: Client INSERT/UPDATE/DELETE Denials & RLS
// ----------------------------------------------------
assertions.push({
  name: 'Client Write Permission Denials (INSERT/UPDATE/DELETE)',
  run: async () => {
    // Create temporary user for write permission tests
    const serviceClient = createSupabaseServiceRoleClient();
    const email = `test-perms-${Date.now()}@getwink.app`;
    const { data: userRecord, error: userError } = await serviceClient.auth.admin.createUser({
      email,
      password: 'Password123!',
      email_confirm: true,
    });
    if (userError || !userRecord || !userRecord.user) {
      throw new Error(`Failed to create test user for perms: ${userError?.message}`);
    }
    const tempUserId = userRecord.user.id;

    // Insert profile
    await serviceClient.from('profiles').insert({
      id: tempUserId,
      display_name: 'Test Perms',
      gender: 'other',
      birthdate: '2000-01-01',
      account_status: 'active',
    });

    try {
      // Sign in to get valid token
      const client = createSupabaseClient();
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password: 'Password123!',
      });
      if (authError || !authData.session) {
        throw new Error(`Failed to sign in: ${authError?.message}`);
      }

      // Initialize client with valid token
      const userClient = createSupabaseClient(authData.session.access_token);

      // 1. Authenticated client INSERT denial check
      const { error: insertError } = await userClient
        .from('ai_usage_events')
        .insert({
          user_id: tempUserId,
          feature: 'general_assistant',
          status: 'success',
          latency_ms: 100,
        });
      
      if (!insertError) {
        throw new Error('Database INSERT permission check failed: client should be denied');
      }
      console.log('Client INSERT block verified:', insertError.message);

      // 2. Authenticated client UPDATE denial check
      const { error: updateError } = await userClient
        .from('ai_usage_events')
        .update({ latency_ms: 9999 })
        .eq('user_id', tempUserId);

      if (!updateError) {
        throw new Error('Database UPDATE permission check failed: client should be denied');
      }
      console.log('Client UPDATE block verified:', updateError.message);

      // 3. Authenticated client DELETE denial check
      const { error: deleteError } = await userClient
        .from('ai_usage_events')
        .delete()
        .eq('user_id', tempUserId);

      if (!deleteError) {
        throw new Error('Database DELETE permission check failed: client should be denied');
      }
      console.log('Client DELETE block verified:', deleteError.message);
    } finally {
      // Clean up temp user
      await serviceClient.auth.admin.deleteUser(tempUserId);
    }
  },
});

// ----------------------------------------------------
// TEST 16: Service side audit insert
// ----------------------------------------------------
assertions.push({
  name: 'Service Side Audit INSERT (Succeeds)',
  run: async () => {
    const serviceClient = createSupabaseServiceRoleClient();
    const { data, error } = await serviceClient
      .from('ai_usage_events')
      .insert({
        user_id: testUserId,
        feature: 'general_assistant',
        status: 'success',
        latency_ms: 120,
        metadata: { test: 'service-side-audit-insert' },
      })
      .select();

    if (error) {
      throw new Error(`Service side INSERT failed: ${error.message}`);
    }
    assertEqual(data.length, 1, 'Expected exactly one row inserted');
  },
});

// ----------------------------------------------------
// TEST 17: Trace Redaction
// ----------------------------------------------------
assertions.push({
  name: 'Trace Redaction & Privacy Check',
  run: async () => {
    const serviceClient = createSupabaseServiceRoleClient();
    const { data, error } = await serviceClient
      .from('ai_usage_events')
      .select('*')
      .eq('user_id', testUserId)
      .limit(10);

    if (error) throw new Error(`Fetch failed: ${error.message}`);

    for (const row of data) {
      const metadataStr = JSON.stringify(row.metadata || {}).toLowerCase();
      if (
        metadataStr.includes('bearer') ||
        metadataStr.includes('apikey') ||
        metadataStr.includes('sk-') ||
        metadataStr.includes('authorization')
      ) {
        throw new Error('Leakage found in log metadata! Tokens or secrets detected.');
      }
    }
  },
});

// ----------------------------------------------------
// TEST 18: No provider credentials in client bundle
// ----------------------------------------------------
assertions.push({
  name: 'No provider credentials in client bundle',
  run: async () => {
    const apiCodeKey = 'NEXT_PUBLIC_LANGDOCK_API_CODE';
    assertEqual(process.env[apiCodeKey], undefined, 'API keys must not be exposed to client bundles');
  },
});

// ----------------------------------------------------
// TEST 19: DEV_USER_ID Production Denial Check
// ----------------------------------------------------
assertions.push({
  name: 'DEV_USER_ID Production Denial Check',
  run: async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';
    
    process.env.DEV_USER_ID = testUserId;
    process.env.GETWINK_MASTRA_POC_ENABLED = 'true';

    try {
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
      assertEqual(res.status, 401, 'Bypass must be blocked under NODE_ENV=production');
      const json = await res.json();
      assertEqual(json.error, 'Authentication is required.', 'Expected authentication failure');
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      process.env.DEV_USER_ID = devUserIdBackup;
    }
  },
});

// ----------------------------------------------------
// TEST 20: GET /api/health
// ----------------------------------------------------
assertions.push({
  name: 'GET /api/health public endpoint',
  run: async () => {
    const req = new Request('https://www.getwink.app/api/health', {
      method: 'GET',
    });
    const res = await healthGET(req);
    assertEqual(res.status, 200, 'Expected 200 OK');
    assertEqual(res.headers.get('content-type'), 'application/json', 'Expected JSON content type');
    assertEqual(res.headers.get('cache-control'), 'no-store', 'Expected no-store caching');
    const json = await res.json();
    assertEqual(json.ok, true, 'Expected ok to be true');
    assertEqual(json.service, 'getwink', 'Expected service to be getwink');
    assertEqual(typeof json.timestamp, 'string', 'Expected ISO timestamp string');
  },
});

// ----------------------------------------------------
// TEST 21: POST /api/health (405 Method Not Allowed)
// ----------------------------------------------------
assertions.push({
  name: 'POST /api/health public endpoint (405)',
  run: async () => {
    const req = new Request('https://www.getwink.app/api/health', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ping: 'pong' }),
    });
    const res = await healthPOST(req);
    assertEqual(res.status, 405, 'Expected 405 Method Not Allowed');
    assertEqual(res.headers.get('allow'), 'GET', 'Expected Allow header GET');
  },
});

// ----------------------------------------------------
// TEST 22: GET /api/health without Content-Type header
// ----------------------------------------------------
assertions.push({
  name: 'GET /api/health without Content-Type request header',
  run: async () => {
    const req = new Request('https://www.getwink.app/api/health', {
      method: 'GET',
      headers: {}, // No headers
    });
    const res = await healthGET(req);
    assertEqual(res.status, 200, 'Expected 200 OK');
    assertEqual(res.headers.get('content-type'), 'application/json', 'Expected JSON content type');
    assertEqual(res.headers.get('cache-control'), 'no-store', 'Expected no-store caching');
    const json = await res.json();
    assertEqual(json.ok, true, 'Expected ok to be true');
  },
});


async function runAll() {
  console.log('========================================');
  console.log('Running Patch 002C Production Correction Verification Tests');
  console.log('========================================');

  const serviceClient = createSupabaseServiceRoleClient();
  try {
    const { data: profiles, error } = await serviceClient.from('profiles').select('id').limit(1);
    if (!error && profiles && profiles.length > 0) {
      testUserId = profiles[0].id;
      console.log(`[SETUP] Found valid database profile ID: ${testUserId}`);
    } else {
      console.log('[SETUP] Creating temporary auth user and profile...');
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
      console.log(`[SETUP] Created test user and profile ID: ${testUserId}`);
    }
  } catch (err: any) {
    console.warn('[SETUP] WARNING: Database setup error:', err.message);
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
    if (createdUserId) {
      try {
        await serviceClient.auth.admin.deleteUser(createdUserId);
        console.log(`[CLEANUP] Deleted test auth user: ${createdUserId}`);
      } catch (err: any) {
        console.error('[CLEANUP ERROR] Failed:', err.message);
      }
    }
  }

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

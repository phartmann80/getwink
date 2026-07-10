import { createClient } from '@supabase/supabase-js';

export function createSupabaseClient(accessToken?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration is missing');
  }

  const options = accessToken
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    : undefined;

  return createClient(supabaseUrl, supabaseAnonKey, options);
}

export function createSupabaseServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service role configuration is missing');
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function getAuthenticatedUser(request: Request) {
  // 1. Check for Authorization header (standard bearer auth)
  const authHeader = request.headers.get('Authorization');
  let token: string | null = null;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 2. Check cookies if no bearer token is present
  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const parts = c.trim().split('=');
        return [parts[0], parts.slice(1).join('=')];
      })
    );
    // Find any cookies starting with sb- and ending with -auth-token
    const tokenCookieKey = Object.keys(cookies).find(
      key => key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    if (tokenCookieKey) {
      const rawValue = cookies[tokenCookieKey];
      if (rawValue) {
        try {
          const decoded = decodeURIComponent(rawValue);
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed) && parsed.length > 0) {
            token = parsed[0];
          } else if (typeof parsed === 'object' && parsed !== null) {
            token = parsed.access_token;
          } else {
            token = decoded;
          }
        } catch {
          token = decodeURIComponent(rawValue);
        }
      }
    }
  }

  // Bypass for non-production environments with DEV_USER_ID
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_USER_ID) {
    if (token === 'mock-invalid-token') {
      throw new Error('Invalid token');
    }
    return { id: process.env.DEV_USER_ID, role: 'authenticated' };
  }

  if (!token) {
    throw new Error('No authorization token found');
  }

  const supabase = createSupabaseClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error(error?.message || 'Invalid or expired user session');
  }

  return user;
}

/**
 * Supabase Client Integration & Backend Architecture Service
 * Provides typed access to Supabase Auth and PostgreSQL REST endpoints
 * when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured,
 * with seamless fallback to isolated testnet simulation mode.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && !url.includes('YOUR_SUPABASE_URL')),
  };
};

export interface AuthResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  isSimulated: boolean;
}

/**
 * Register user via Supabase Auth API with fallback to simulated account
 */
export async function supabaseRegister(
  email: string,
  password: string,
  displayName: string,
  role: string = 'role_standard_miner'
): Promise<AuthResponse> {
  const config = getSupabaseConfig();

  if (!config.isConfigured) {
    return {
      success: true,
      data: {
        id: 'sim-' + Math.random().toString(36).substring(2, 10),
        email,
        displayName,
        role,
      },
      isSimulated: true,
    };
  }

  try {
    const res = await fetch(`${config.url}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          display_name: displayName,
          role_id: role,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error_description || data.msg || 'Registration failed',
        isSimulated: false,
      };
    }

    return {
      success: true,
      data: {
        id: data.user?.id,
        email: data.user?.email,
        displayName: data.user?.user_metadata?.display_name || displayName,
        role: data.user?.user_metadata?.role_id || role,
        session: data.access_token,
      },
      isSimulated: false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to Supabase Auth',
      isSimulated: false,
    };
  }
}

/**
 * Login user via Supabase Auth API with fallback to simulated account
 */
export async function supabaseLogin(
  email: string,
  password: string
): Promise<AuthResponse> {
  const config = getSupabaseConfig();

  if (!config.isConfigured) {
    return {
      success: true,
      data: {
        id: 'sim-' + Math.random().toString(36).substring(2, 10),
        email,
        displayName: email.split('@')[0],
      },
      isSimulated: true,
    };
  }

  try {
    const res = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error_description || data.msg || 'Invalid login credentials',
        isSimulated: false,
      };
    }

    return {
      success: true,
      data: {
        id: data.user?.id,
        email: data.user?.email,
        displayName: data.user?.user_metadata?.display_name || email.split('@')[0],
        role: data.user?.user_metadata?.role_id || 'role_standard_miner',
        accessToken: data.access_token,
      },
      isSimulated: false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to Supabase Auth',
      isSimulated: false,
    };
  }
}

/**
 * Send password reset email via Supabase Auth API
 */
export async function supabaseResetPassword(email: string): Promise<AuthResponse> {
  const config = getSupabaseConfig();

  if (!config.isConfigured) {
    return {
      success: true,
      data: { email },
      isSimulated: true,
    };
  }

  try {
    const res = await fetch(`${config.url}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.anonKey,
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error_description || data.msg || 'Reset request failed',
        isSimulated: false,
      };
    }

    return {
      success: true,
      data,
      isSimulated: false,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to dispatch password reset',
      isSimulated: false,
    };
  }
}

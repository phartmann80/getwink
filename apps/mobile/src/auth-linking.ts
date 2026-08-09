import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { supabase } from './supabase';

export type ConfirmationLinkStatus = 'idle' | 'exchanging' | 'expired' | 'error';

const CALLBACK_PREFIX = 'getwink://auth/callback';

function isAuthCallback(url: string) {
  return url.startsWith(CALLBACK_PREFIX);
}

// Never log `url` or the exchange error's raw contents: both can carry the
// confirmation code / tokens. Only a coarse status is surfaced to the UI.
async function exchange(url: string, setStatus: (status: ConfirmationLinkStatus) => void) {
  setStatus('exchanging');
  const { error } = await supabase.auth.exchangeCodeForSession(url);
  if (!error) {
    setStatus('idle');
    return;
  }
  const expiredOrReused = /expire|invalid|used/i.test(error.message);
  setStatus(expiredOrReused ? 'expired' : 'error');
}

export function useAuthLinking() {
  const [status, setStatus] = useState<ConfirmationLinkStatus>('idle');
  useEffect(() => {
    let active = true;
    Linking.getInitialURL().then(url => {
      if (active && url && isAuthCallback(url)) void exchange(url, setStatus);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isAuthCallback(url)) void exchange(url, setStatus);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return status;
}

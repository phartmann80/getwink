import { useEffect, useRef, useState } from 'react';
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
  const exchangingRef = useRef(false);
  useEffect(() => {
    let active = true;
    const doExchange = async (url: string) => {
      if (exchangingRef.current) return;
      exchangingRef.current = true;
      try {
        await exchange(url, (s) => { if (active) setStatus(s); });
      } finally {
        exchangingRef.current = false;
      }
    };
    Linking.getInitialURL().then(url => {
      if (active && url && isAuthCallback(url)) void doExchange(url);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (isAuthCallback(url)) void doExchange(url);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return status;
}
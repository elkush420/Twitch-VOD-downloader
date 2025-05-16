'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export function AuthCallbackPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const { setUser, setTokens } = useAuth();

  useEffect(() => {
    if (!code) return;

    async function exchangeCode() {
      try {
        const res = await fetch('/api/auth/twitch-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        const { user, tokens } = await res.json();

        if (user) {
          sessionStorage.setItem('twitchTokens', JSON.stringify(tokens));
          sessionStorage.setItem('twitchUser', JSON.stringify(user));
          setTokens(tokens);
          setUser(user);
          router.replace('/');
        } else {
          console.error('Login failed');
        }
      } catch (err) {
        console.error('OAuth error:', err);
      }
    }

    exchangeCode();
  }, [code, setUser, setTokens, router]);

  return <p>Logging you in via Twitch...</p>;
}

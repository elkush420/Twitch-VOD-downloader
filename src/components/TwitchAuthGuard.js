'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';

export default function TwitchAuthGuard({ children }) {
  const { user, login } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    
    if (!user) {
      login();
    } else {
      setChecking(false);
    }
  }, [user, login]);

  if (checking && !user) {
    return <p>Redirecting to Twitch...</p>;
  }

  return children;
}

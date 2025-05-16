'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('twitchUser');
    const storedTokens = sessionStorage.getItem('twitchTokens');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedTokens) {
      setTokens(JSON.parse(storedTokens));
    }
  }, []);

  const login = () => {
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = 'user:read:email';

    const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    window.location.href = twitchAuthUrl;
  };

  const logout = () => {
    sessionStorage.removeItem('twitchUser');
    sessionStorage.removeItem('twitchTokens');
    setUser(null);
    setTokens(null);
  };

  return (
    <AuthContext.Provider value={{ user, tokens, login, logout, setUser, setTokens }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

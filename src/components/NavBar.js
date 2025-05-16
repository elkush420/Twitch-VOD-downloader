'use client';

import { useAuth } from '../context/auth-context';

export default function NavBar() {
  const { user, login, logout } = useAuth();

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: 16, borderBottom: '1px solid #ccc' }}>
      <span><strong>VOD Downloader</strong></span>
      {user ? (
        <div>
          <span>{user.display_name}</span>
          <button onClick={logout} style={{ marginLeft: 10 }}>Logout</button>
        </div>
      ) : (
        <button onClick={login}>Login with Twitch</button>
      )}
    </nav>
  );
}

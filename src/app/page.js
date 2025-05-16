'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/auth-context';
import awsExports from '../../aws-exports';
import { listStreamersQuery } from '../utils/queries';
import Link from 'next/link';

export default function Page() {
  const { user, tokens } = useAuth();
  const [streamers, setStreamers] = useState([]);

  useEffect(() => {
    if (!tokens?.access_token) return;

    async function fetchData() {
      try {
        let nextToken = null;

        do {
          const response = await fetch(awsExports.aws_appsync_graphqlEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokens.access_token}`,
            },
            body: JSON.stringify({
              query: listStreamersQuery,
              variables: { nextToken },
            }),
          });

          const result = await response.json();
          console.log('GraphQL result:', result);

          setStreamers((prev) => {
            const all = [...prev, ...result.data.listStreamers.items];
            const unique = Array.from(new Map(all.map(item => [item.userId, item])).values());
            return unique;
          });

          nextToken = result.data.listStreamers.nextToken;
        } while (nextToken);

      } catch (err) {
        console.error('Error fetching streamers', err);
      }
    }

    fetchData();
  }, [tokens]);

  if (!user || !tokens) return <p>Loading user info...</p>;

  return (
    <main style={{ padding: 20 }}>
      {streamers.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {streamers.map((streamer) => (
            <Link
              key={streamer.userId}
              href={`/${streamer.userId}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ border: '1px solid #ccc', padding: 10, borderRadius: 8, cursor: 'pointer' }}>
                <img
                  src={streamer.userProfileImageUrl}
                  alt={streamer.userDisplayName}
                  style={{ width: 100, height: 100, borderRadius: '50%' }}
                />
                <h3>{streamer.userDisplayName}</h3>
                <p>@{streamer.userName}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p>Loading streamers...</p>
      )}
    </main>
  );
}

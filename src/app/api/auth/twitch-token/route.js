export async function POST(req) {
  const body = await req.json();
  const code = body.code;

  const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;

  try {
    const body = `client_id=${clientId}&client_secret=${clientSecret}&code=${code}&grant_type=authorization_code&redirect_uri=${redirectUri}`;

    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body,
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return Response.json({ error: 'Token exchange failed', tokenData }, { status: 401 });
    }

    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Client-Id': clientId,
      },
    });

    const userData = await userRes.json();
    const user = userData.data[0];

    return Response.json({ user, tokens: tokenData });
  } catch (err) {
    console.error('Error exchanging code:', err);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}

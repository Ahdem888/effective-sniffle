import fetch from 'node-fetch';

export default async function handler(req, res) {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI = process.env.REDIRECT_URI;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://linea.safetydiscord.icu/';

  const code = req.query.code;

  if (!code) return res.status(400).send('No code provided');

  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    });

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      console.error('Token error response:', text);
      return res.status(tokenResponse.status).send(text);
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `${tokenData.token_type} ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const text = await userResponse.text();
      console.error('User fetch error:', text);
      return res.status(500).send('Error fetching user info');
    }

    const userData = await userResponse.json();

    const redirectUrl = new URL(FRONTEND_URL);
    redirectUrl.searchParams.set('username', userData.username);
    redirectUrl.searchParams.set('discriminator', userData.discriminator);
    redirectUrl.searchParams.set('id', userData.id);
    redirectUrl.searchParams.set('avatar', `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`);

    res.writeHead(302, { Location: redirectUrl.toString() });
    res.end();
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send('Internal server error');
  }
}

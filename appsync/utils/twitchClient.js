const fetch = require('node-fetch');
const { getSecretValue } = require('./SecretsManagerUtils');
const { TWITCH_CREDENTIALS_SECRET_ARN } = require('./config');


let accessToken = undefined;
let requestClientId = undefined;
let twitchCredentials = undefined;

async function getAccessToken() {
  if (!accessToken) {
    accessToken = generateAccessToken();
  }
  return accessToken;
}

async function getTwitchCredentials() {
  if (!twitchCredentials) {
    twitchCredentials = getSecretValue(TWITCH_CREDENTIALS_SECRET_ARN);
  }
  return twitchCredentials;
}

async function generateAccessToken() {
  const { clientId, clientSecret, url } = JSON.parse((await getTwitchCredentials()).SecretString);
  requestClientId = clientId;

  const res = await fetch(`${url}/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
    method: 'POST',
    headers: { },
  });

  const responseData = await res.json();

  return responseData['access_token'];
}

async function getVideosByUserid(userId) {
  const accessToken = await getAccessToken();

  const res = await fetch(`https://api.twitch.tv/helix/videos?user_id=${userId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': requestClientId,
    },
  });

  const responseData = await res.json();

  return responseData.data || [];
}

async function getUser(username) {
  const accessToken = await getAccessToken();

  const res = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': requestClientId,
    },
  });

  const responseData = await res.json();

  return responseData.data[0] || undefined;
}

module.exports = {
  getVideosByUserid,
  getUser,
}
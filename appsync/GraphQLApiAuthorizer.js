const fetch = require("node-fetch");

async function handler(event, context) {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  let response = {
    isAuthorized: false
  };
  
  let {
    authorizationToken
  } = event;

  if (authorizationToken.includes(' ')) {
    authorizationToken = authorizationToken.split(' ')[1];
  }

  try {
    const twitchResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authorizationToken}`,
      }
    });

    const resStatus = twitchResponse.status;
    let resBody = await twitchResponse.text();

    if (resStatus !== 200) {
      return response;
    }
    
    try {
      resBody = JSON.parse(resBody);
    } catch (err) {
      console.error(`resBody was not JSON, ${resBody}`);
      return response;
    }

    console.log(resStatus);
    console.log(resBody);

    response = {
      isAuthorized: true,
      ttlOverride: resBody.expires_in,
      resolverContext: {
        userId: resBody.user_id
      }
    };
    return response;

  } catch (err) {
    console.error(err);
    return response;
  }
}

module.exports = {
  handler,
};

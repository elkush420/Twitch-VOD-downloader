const { SecretsManager } = require('@aws-sdk/client-secrets-manager');
const cfnResponse = require('./utils/cfn-response');

let secretsClient = undefined;

async function handler(event, context) {
  console.log(JSON.stringify(event));
  console.log(context);

  try {
    const { ResourceProperties: { secretArn }} = event;
    const region = secretArn.split(':')[3];
  
    if (!secretsClient) {
      secretsClient = new SecretsManager({ region });
    }
    const secret = await secretsClient.getSecretValue({ SecretId: secretArn });
    const { clientId, clientSecret, url } = JSON.parse(secret.SecretString);

    await cfnResponse.send(event, context, event.LogicalResourceId, 'SUCCESS', { clientId, clientSecret, url });
  } catch (err) {
    console.error('Error:', err);
    await cfnResponse.send(event, context, event.LogicalResourceId, 'FAILED', { clientId, clientSecret, url });
  }
}

module.exports = {
  handler,
};

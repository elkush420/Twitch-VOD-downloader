const { SecretsManager } = require('@aws-sdk/client-secrets-manager');

let client = undefined;

async function getSecretValue(secretId) {
  if (!client) {
    client = new SecretsManager();
  }
  //
  const response = await client.getSecretValue({
    SecretId: secretId,
  });
  return response;
}

module.exports = {
  getSecretValue,
};

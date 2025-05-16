const { TABLE_NAME } = require('./utils/config');
const dynamo = require('./utils/DynamoDBUtils');

const { getUser } = require('./utils/twitchClient');

async function handler(event, context) {
  console.log(event);
  const { field, arguments: { username } } = event;

  const user = await getUser(username);
  if (!user) {
    throw new Error(`Streamer ${username} not found`);
  };

  const { id, login, display_name, profile_image_url } = user;

  const userItem = {
    pk: `STREAMER`,
    sk: `STREAMER#${id}`,
    userId: id,
    userName: login,
    userDisplayName: display_name,
    userProfileImageUrl: profile_image_url,
  };

  await dynamo.putItem({
    tableName: TABLE_NAME,
    item: userItem
  });

  return userItem;
}

module.exports = {
  handler,
};

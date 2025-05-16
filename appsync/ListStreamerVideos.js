const { TABLE_NAME } = require('./utils/config');
const dynamo = require('./utils/DynamoDBUtils');

const { getVideosByUserid } = require('./utils/twitchClient');

async function handler(event, context) {
  console.log(event);
  const { pk, sk, userId, userName } = event;

  const latestVideo = (await getVideosByUserid(userId))[0];
  console.log(`latestVideo: ${JSON.stringify(latestVideo, null, 2)}`);
  if (!latestVideo) {
    console.log(`No latestVideo found for ${userName / userId}`);
    return [];
  }
  const { id, url, published_at, duration, thumbnail_url } = latestVideo;

  if (thumbnail_url.includes('vod-secure.twitch.tv')) {
    console.log('video for a current live stream and not to be downloaded yet')
    return [];
  }

  const videoFromDynamo = await dynamo.getItem({
    tableName: TABLE_NAME,
    key: {
      pk: `VIDEO#${userId}`,
      sk: `VIDEO#${id}`
    }
  });
  console.log(`videoFromDynamo: ${JSON.stringify(videoFromDynamo, null, 2)}`);

  if (videoFromDynamo) {
    console.log(`Latest video from twitch for ${userName} / ${userId} has allready been ingested`);
    return [];
  }

  const videoItem = {
    pk: `VIDEO#${userId}`,
    sk: `VIDEO#${id}`,
    videoId: id,
    userId: userId,
    twitchVideoUrl: url,
    videoPublishedTime: published_at,
    videoDuration: duration,
    videoProcessingStatus: 'STARTED'
  };

  await dynamo.putItem({
    tableName: TABLE_NAME,
    item: videoItem
  });

  return [
    {
      ...videoItem
    }
  ];
}

module.exports = {
  handler,
};

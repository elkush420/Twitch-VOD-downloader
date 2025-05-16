
export const listStreamersQuery = `
query MyQuery($nextToken: String) {
  listStreamers(limit: 10, nextToken: $nextToken) {
    nextToken
    items {
      pk
      sk
      userDisplayName
      userId
      userName
      userProfileImageUrl
    }
  }
}`;

export const listStreamerVideos = `
query MyQuery($userId: String!) {
  listStreamersVideos(userId: $userId) {
    items {
      pk
      processedManifestUrl
      sk
      twitchManifestUrl
      twitchVideoUrl
      userId
      videoId
      videoProcessingStatus
      videoPublishedTime
    }
    nextToken
  }
}`;
const fetch = require('node-fetch');
const m3u8Parser = require('m3u8-parser');
const { SFN } = require("@aws-sdk/client-sfn");
const { S3 } = require('@aws-sdk/client-s3');

const sfnClient = new SFN({region: process.env.AWS_REGION || "eu-west-2" });
const s3Client = new S3({ region: process.env.AWS_REGION || "eu-west-2" });

let stateInput = '';

(async () => {
  console.log(process.env);
  const { VIDEO_BUCKET, CLOUDFRONT_DOMAIN_NAME, STATE_INPUT, VIDEO_DIRECTORY, TASK_TOKEN_ENV_VARIABLE } = process.env;
  if (!VIDEO_BUCKET || !STATE_INPUT || !VIDEO_DIRECTORY || !CLOUDFRONT_DOMAIN_NAME) {
    throw new Error(`required env var is missing.\nSTATE_INPUT:${STATE_INPUT}\nVIDEO_BUCKET:${VIDEO_BUCKET}\CLOUDFRONT_DOMAIN_NAME:${CLOUDFRONT_DOMAIN_NAME}\nVIDEO_DIRECTORY:${VIDEO_DIRECTORY}`);
  }
  stateInput = JSON.parse(STATE_INPUT);
  console.log(stateInput);

  try {

    const { twitchManifestUrl, videoId, userId } = stateInput;

    const manifestUrlStem = twitchManifestUrl.replace(twitchManifestUrl.split('/').pop(), '');

    const manifestResponse = await fetch(twitchManifestUrl, {
      method: 'GET',
      headers: {},
    });
    const manifestData = await manifestResponse.text();

    
    const manifestKey = `${VIDEO_DIRECTORY}/index.m3u8`;
    const processedManifestUri = `s3://${VIDEO_BUCKET}/${VIDEO_DIRECTORY}/index.m3u8`;
    const processedManifestUrl = `https://${CLOUDFRONT_DOMAIN_NAME}/${VIDEO_DIRECTORY}/index.m3u8`
    const uploadManifestResponse = await s3Client.putObject({
      Bucket: VIDEO_BUCKET,
      Key: manifestKey,
      Body: manifestData,
      Tagging: `userId=${userId}&videoId=${videoId}`
    });
    console.log(`uploadManifestResponse for ${manifestKey}: ${uploadManifestResponse['$metadata'].httpStatusCode}`);

    const parser = new m3u8Parser.Parser();
    parser.push(manifestData);
    parser.end();

    const { manifest: { segments }} = parser;
    
    console.log(JSON.stringify(segments, null, 2));

    for (let i = 0; i < segments.length; i++) {
      const { uri } = segments[i];

      const segmentUrl = `${manifestUrlStem}${uri}`;
      console.log(`requesting segment: ${segmentUrl}`);

      const segmentResponse = await fetch(segmentUrl, {
        method: 'GET',
        headers: {
          Accept: '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive'
        },
      });

      const segmentData = Buffer.from(await segmentResponse.arrayBuffer());

      const segmentKey = `${VIDEO_DIRECTORY}/${uri}`;
      const uploadSegmentResponse = await s3Client.putObject({
        Bucket: VIDEO_BUCKET,
        Key: segmentKey,
        Body: segmentData,
        ContentType: 'video/MP2T',
        Tagging: `userId=${userId}&videoId=${videoId}`
      });
      console.log(`uploadSegmentResponse for ${segmentKey}: ${uploadSegmentResponse['$metadata'].httpStatusCode}\n${JSON.stringify(uploadSegmentResponse)}`);
    }

    if (TASK_TOKEN_ENV_VARIABLE) {
      console.log(`TASK_TOKEN_ENV_VARIABLE found. Calling 'sendTaskSuccess'`);
      const res = await sfnClient.sendTaskSuccess({
        taskToken: TASK_TOKEN_ENV_VARIABLE,
        output: JSON.stringify({ ...stateInput, processedManifestUri, processedManifestUrl }),
      });
      console.log(`TaskSuccess callback result: ${JSON.stringify(res)}`);
    } else {
      console.log(`TASK_TOKEN_ENV_VARIABLE not found.`);
    }
  } catch (error) {
    console.log('received error', { name: error.name, message: error.message});

    if (process.env.TASK_TOKEN_ENV_VARIABLE) {
      console.log(`TASK_TOKEN_ENV_VARIABLE found. Calling 'sendTaskFailure'`);

      const res = await sfnClient.sendTaskFailure({
        taskToken: process.env.TASK_TOKEN_ENV_VARIABLE,
        error: error.name,
        cause: error.message
      });
      console.log(`TaskFailure callback result: ${JSON.stringify(res)}`);
    } else {
      console.log(`TASK_TOKEN_ENV_VARIABLE not found. Not calling 'sendTaskFailure'`);
    }
  }
})();

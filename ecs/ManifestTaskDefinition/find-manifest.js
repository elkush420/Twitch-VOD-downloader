const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const m3u8Parser = require('m3u8-parser');

const { SFN } = require("@aws-sdk/client-sfn");

const sfnClient = new SFN({region: process.env.AWS_REGION || "eu-west-2" });

const PUPPETEER_MAX_WAIT_TIME = 60 * 1000; // puppeteer waits upto 60 seconds
const PUPPETEER_MAX_RETRIES = 5; // if the manifest url can't be found, retry this many times.
const PUPPETEER_WAIT_TIME_INTERVAL = 1000; // puppeteer checks every 1000ms for if the m3u8 request has been intercepted.

let stateInput = '';

async function findParentManifestUrl(twitchVideoUrl) {
  let parentManifestUrl = null;
  const startTime = Date.now();

  console.log(`finding manifest url for ${twitchVideoUrl}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    console.info(`intercepted request to ${url}`);
    if (url.includes('.m3u8') && url.includes('usher.ttvnw.net')) {
      parentManifestUrl = url;
    }
    request.continue();
  });

  await page.goto(twitchVideoUrl, {
    waitUntil: 'networkidle2'
  });
  
  while (!parentManifestUrl && (Date.now() - startTime) < PUPPETEER_MAX_WAIT_TIME) {
    await new Promise(resolve => setTimeout(resolve, PUPPETEER_WAIT_TIME_INTERVAL));
  }
  
  if (!parentManifestUrl) {
    await browser.close();
    throw new Error(`Timeout: .m3u8 request not intercepted`);
  }

  console.log(`intercepted url: ${parentManifestUrl}`);
  await browser.close();
  return parentManifestUrl;
}

(async () => {
  console.log(process.env);
  if (!process.env.STATE_INPUT) {
    throw new Error('STATE_INPUT env var is missing');
  }
  
  stateInput = JSON.parse(process.env.STATE_INPUT);
  console.log(stateInput);

  try {
    const { twitchVideoUrl } = stateInput;

    let parentManifestUrl = undefined;
    let parentManifestUrlAttempt = 0;
    
    do {
      try {
        parentManifestUrl = await findParentManifestUrl(twitchVideoUrl);
      } catch (error) {
        if (error.message === 'Timeout: .m3u8 request not intercepted') {
          parentManifestUrlAttempt ++;
          console.log(`Could not find the manifest. Attempt ${parentManifestUrlAttempt}/${PUPPETEER_MAX_RETRIES}`);
          if (parentManifestUrlAttempt === PUPPETEER_MAX_RETRIES) {
            throw new Error('TimeoutManifest');
          }
        }
      }
    } while (!parentManifestUrl && parentManifestUrlAttempt < PUPPETEER_MAX_RETRIES)
  
    const res = await fetch(parentManifestUrl, {
      method: 'GET',
      headers: {},
    });

    const parentManifestData = await res.text();
    const parentManifestStatus = await res.status;

    if (parentManifestStatus === 403 && parentManifestData.includes("Manifest is restricted")) {
      throw new Error("RestrictedManifest");
    }
    console.log(`parentManifestData\n${parentManifestData}`);
  
    console.log(`parentManifestStatus: ${parentManifestStatus}`);
  
    const parser = new m3u8Parser.Parser();
    parser.push(parentManifestData);
    parser.end();
  
    const parsedParentManifest = parser.manifest;
  
    const childManifestUrl = (parsedParentManifest.playlists.find((manifest) =>
      (manifest.attributes.RESOLUTION.width === 1920 && manifest.attributes.RESOLUTION.height === 1080) ||
    (manifest.attributes.RESOLUTION.width === 1280 && manifest.attributes.RESOLUTION.height === 720)
    )).uri;
  
    console.log(`Extracted childManifestUrl: ${childManifestUrl}`);
  
    if (process.env.TASK_TOKEN_ENV_VARIABLE) {
      console.log(`TASK_TOKEN_ENV_VARIABLE found. Calling 'sendTaskSuccess'`);
      const taskSuccessPayload = JSON.stringify({ ...stateInput, twitchManifestUrl: childManifestUrl });
      console.log(`taskSuccessPayload: ${taskSuccessPayload}`);
      const res = await sfnClient.sendTaskSuccess({
        taskToken: process.env.TASK_TOKEN_ENV_VARIABLE,
        output: taskSuccessPayload,
      });
      console.log(`TaskSuccess callback result: ${JSON.stringify(res)}`);
    } else {
      console.log(`TASK_TOKEN_ENV_VARIABLE not found. Not calling 'sendTaskSuccess'`);
    }
  } catch (error) {
    console.log('received error', { name: error.name, message: error.message});

    if (process.env.TASK_TOKEN_ENV_VARIABLE) {
      console.log(`TASK_TOKEN_ENV_VARIABLE found. Calling 'sendTaskFailure'`);

      const res = await sfnClient.sendTaskFailure({
        taskToken: process.env.TASK_TOKEN_ENV_VARIABLE,
        error: error.message, // should be RestrictedManifest or TimeoutManifest
        cause: JSON.stringify({ name: error.name, message: error.message })
      });
      console.log(`TaskFailure callback result: ${JSON.stringify(res)}`);
    } else {
      console.log(`TASK_TOKEN_ENV_VARIABLE not found. Not calling 'sendTaskFailure'`);
    }
  }
})();

const https = require("https");
const url = require("url");

exports.SUCCESS = "SUCCESS";
exports.FAILED = "FAILED";

exports.send = async function (event, context, physicalResourceId, responseStatus, responseData, noEcho) {
  const responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
    PhysicalResourceId: physicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    NoEcho: noEcho || false,
    Data: responseData
  });

  console.log("Response body:\n", responseBody);

  const parsedUrl = url.parse(event.ResponseURL);
  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: "PUT",
    headers: {
      "content-type": "",
      "content-length": responseBody.length
    }
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, function (response) {
      console.log("Status code: " + parseInt(response.statusCode));
      resolve("Successfully sent response");
    });
    
    request.on("error", function (error) {
      console.error("send(..) failed executing https.request(..): " + error);
      reject(error);
    });
    
    request.write(responseBody);
    request.end();
  });
};

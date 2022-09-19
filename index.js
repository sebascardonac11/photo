const Photo = require('./functions/photo')
const jwt_decode = require('jwt-decode');
const parser = require('lambda-multipart-parser');

var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });

exports.handler = async function (event, context, callback) {
  //console.log("Event Photo: ", JSON.stringify(event));
  var photo = new Photo(process.env.BUCKET, process.env.DYNAMODB);
  var response = { statusCode: 401, data: "Whitout Information" };
  const client = new AWS.Rekognition();
  event.Records.forEach(async Record => {
    console.log('Bucket',Record.s3.bucket.name);
    const params = {
      Image: {
        S3Object: {
          Bucket: 'photoeventdev',
          Name: 'photoClient/SCC_0032.jpg'
        },
      },
      MaxLabels: 10
    }
    console.log("Antes de procesar");
    const data = await client.detectLabels(params).promise();
    console.log("Photo processed", data);
    /*const bucketName = Record.s3.bucket.name;
    const Key = Record.s3.object.key;
    response = await photo.analyzePhoto(bucketName, Key);
    console.log("Photo processed", response);*/
  });
  return;


  switch (event.httpMethod) {
    case 'PUT':
      console.log("### PUT ####");
      var authorizationDecoded = jwt_decode(event.headers.Authorization);
      const form = await parser.parse(event);
      var key = form.event + '/' + form.session + '/' + form.files[0].filename;
      var contenType = form.files[0].contentType;
      var body = Buffer.from(form.files[0].content);
      response = await photo.putPhoto(form.files[0].filename, contenType, body, authorizationDecoded.email, form.event, form.session);
      break;
    default:
    
      break;
  }
  console.log("Response: ", response);
  return {
    statusCode: response.statusCode,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
      "Content-Type": 'application/json'
    },
    body: JSON.stringify(response.data)
  };
}
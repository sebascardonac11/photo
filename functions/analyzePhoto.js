const AWS = require('aws-sdk')
function analyzePhoto(bucket, photo) {
  this.bucket = bucket;
  this.photo = photo;
  const client = new AWS.Rekognition();
  this.getLabel = async function () {
    try {
      const params = {
        Image: {
          S3Object: {
            Bucket: bucket,
            Name: photo
          },
        },
        MaxLabels: 10
      }
      var labelsTags = "";
     // const data = await client.detectLabels(params, function (err, data) { if (err) console.log(err, err.stack); }).promise();
     const data = await client.detectLabels(params, function(err, response) {
      console.log("Llego de labels");
      if (err) {
        console.log(err, err.stack); // if an error occurred
      } else {
        console.log("Labels: ", JSON.stringify(response));
      } }).promise();
     console.log("Labels",data);
     /* data.Labels.forEach(label => {
        if (labelsTags.search(label.Name) == -1)
          labelsTags += label.Name + "-";
      });*/
      return "[]";
    } catch (error) {
      console.log("Something wrong in analyzePhoto.getLabel: ", error)
    }
  };
  this.getText = async function () {
    const paramsText = {
      Image: {
        S3Object: {
          Bucket: bucket,
          Name: photo
        }
      }
    };
    const data = await client.detectText(paramsText).promise();
    var texts = ""
    data.TextDetections.forEach(text => {
      if (texts.search(text.DetectedText) == -1)
        texts += text.DetectedText + "-";
    });
    return texts;
  };
}
module.exports = analyzePhoto
function analyzePhoto(bucket,photo){
        this.bucket=bucket;
        this.photo=photo;
        const AWS = require('aws-sdk')
        AWS.config.update({region:'us-west-2'});
        const config = new AWS.Config({
            accessKeyId:  process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION
            });
        const client = new AWS.Rekognition();
  this.getLabel = async function(){
    const params = {
              Image: {
                  S3Object: {
                      Bucket: bucket,
                      Name: photo
                  },
               },
              MaxLabels: 10
          }
    var labelsTags = ""
    const data = await client.detectLabels(params).promise();
    data.Labels.forEach(label => {
     if (labelsTags.search(label.Name)==-1)
                labelsTags+=label.Name + "-";
           });
    return labelsTags;
    };
  this.getText = async function(){
        const paramsText = {
          Image: {
            S3Object: {
            Bucket: bucket,
            Name: photo
            }}
        };
        const data = await client.detectText(paramsText).promise();
        var texts=""
         data.TextDetections.forEach(text => {
            if (texts.search(text.DetectedText)==-1)
                  texts+=text.DetectedText + "-";
         });
        return texts;
    };
}
module.exports = analyzePhoto
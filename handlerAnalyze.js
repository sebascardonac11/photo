const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const detectPhoto = require('./functions/analyzePhoto');

module.exports.readS3File =  (event) => {
    event.Records.forEach( async Record => {
        const Key = Record.s3.object.key;
        const user= Record.userIdentity;
        const bucketName=Record.s3.bucket.name;
        var detectPhotos =  new detectPhoto(bucketName,Key);
        var labels = await detectPhotos.getLabel();
        var texts = await detectPhotos.getText();
        var params2 = {
                    Bucket: bucketName,
                    Key: Key,
                    Tagging: {
                     TagSet: [
                     {
                       Key: "Labels",
                       Value: labels
                      },
                      {
                        Key: "Texts",
                        Value: texts
                         }]
                    }
                   };
        s3.putObjectTagging(params2,function(err, data) {
                  if (err) console.log(err, err.stack); // an error occurred
        });
     });
    return;
};
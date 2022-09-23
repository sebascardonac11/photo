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
      const data = await client.detectLabels(params, function (err, data) { if (err) console.log(err, err.stack); }).promise();
      data.Labels.forEach(label => {
        if (labelsTags.search(label.Name) == -1)
          labelsTags += label.Name + "-";
      });

      return {'labelsTags':labelsTags,arrayTags:data.Labels};
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
    return {'texts':texts,'arrayTexts':data.TextDetections};
  };
  this.searchUser = async function(label,text,persons){
    var personsID=[]
    var isPerson;
    for (const i in persons) {
      for (const j in persons[i].texts){
        var pos =text.indexOf(persons[i].texts[j])
          if (pos != -1){
            personsID.push(persons[i])
            console.log('Encontre texto el texto: ',text[pos]);
          }
      }
    }
    return personsID;
  }
}
module.exports = analyzePhoto
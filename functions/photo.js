const AWS = require('aws-sdk');
const s3Client = new AWS.S3();
//AWS.config.update({ region: 'us-east-2' });
const dynamo = new AWS.DynamoDB.DocumentClient();

const AnalyzePhoto = require('./analyzePhoto')

module.exports = class Photo {
    BUCKET;
    DYNAMODBTABLE;
    constructor(bucket, table) {
        this.BUCKET = bucket;
        this.DYNAMODBTABLE = table
    }

    async putPhoto(fileName, contentType, body, email, event, session) {
        try {
            var filePath = "photoClient/" + event + "/" + session + "/" + fileName
            var params = {
                Bucket: this.BUCKET,
                Body: body,
                Key: filePath,
                ContentType: contentType,
                Metadata: {
                    "Photographer": email
                }
            };
            var item = { 'photographer': email, 'session': session, 'key': fileName }
            var photoDB = await this.insertPhotoDB(item);
            console.log('DB: ', photoDB);
            var photo = await s3Client.upload(params).promise();
            return {
                statusCode: 200,
                data: photo
            }
        } catch (error) {
            console.log("Something wrong in photo.putPhoto: ", error)
            return {
                statusCode: 404,
                data: error
            }
        }
    }
    async insertPhotoDB(Item) {
        try {
            var params = {
                TableName: this.DYNAMODBTABLE,
                Item: Item
            }
            return await dynamo.put(params).promise();
        } catch (error) {
            console.log("Something wrong in photo.insertPhotoDB: ", error);
        }
    }
    async analyzePhoto(bucketName, Key) {
        try {
            var detectPhotos = new AnalyzePhoto(bucketName, Key);
            console.log("Analysing key: ", detectPhotos.bucket);
            var labels = await detectPhotos.getLabel();
            console,log("Labels: ",labels);
            var texts = await detectPhotos.getText();
            var params = {
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
            console.log("Etiquetas",JSON.stringify(params));
            var response =s3Client.putObjectTagging(params, function (err, data) { if (err) console.log(err, err.stack); });
            return {
                statusCode: 200,
                data: response
            }
        } catch (error) {
            console.log("Something wrong in photo.analyzePhoto: ", error)
            return {
                statusCode: 404,
                data: error
            }
        }
    }
}
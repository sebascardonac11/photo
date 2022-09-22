const AWS = require('aws-sdk');
const s3Client = new AWS.S3();
//AWS.config.update({ region: 'us-east-2' });
const Str = require('@supercharge/strings')
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
            this.savePhotoDB(session,event,fileName,filePath,email);
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
            var labels = await detectPhotos.getLabel();
            var texts = await detectPhotos.getText();
            var params = {
                Bucket: bucketName,
                Key: Key
            };
            var tagging = await s3Client.getObjectTagging(params).promise();
            if (tagging.TagSet.length == 0) {
                params.Tagging = {
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
                await s3Client.putObjectTagging(params).promise();
            }
            return {
                statusCode: 200,
                data: '{label:{' + labels + '},text:{' + texts + '} }'
            }
        } catch (error) {
            console.log("Something wrong in photo.analyzePhoto: ", error)
            return {
                statusCode: 404,
                data: error
            }
        }
    }
    async savePhotoDB(session,event,fileName,filePath,email) {
        try {
            const uuid = Str.uuid();
            var item ={
                'mainkey':session,
                'mainSsort':'PHOTO#'+uuid,
                'entity':'PHOTO',
                'photographer':email,
                'event':event,
                'name':fileName,
                'filePath':filePath
            }
            var params = {
                TableName: this.DYNAMODBTABLE,
                Item: item
            }
            console.log("params: ", params)
            var result = await dynamo.put(params).promise();
            console.log("result: ", result)
        } catch (error) {
            console.log("Someting Wrong in savePhotoDB ", error)
            return {
                statusCode: 409,
                data: result
            };
        }
    }
}
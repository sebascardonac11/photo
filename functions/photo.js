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
            const uuid = Str.uuid();
            var photoID = 'PHOTO-' + uuid;
            var filePath = "photoClient/" + event + "/" + session + "/" + fileName;
            var params = {
                Bucket: this.BUCKET,
                Body: body,
                Key: filePath,
                ContentType: contentType,
                Metadata: {
                    "Photographer": email,
                    "Session": session,
                    "Event": event,
                    "photoID": photoID
                }
            };
            var photo = await s3Client.upload(params).promise();
            var item = {
                'mainkey': session,
                'mainsort': photoID,
                'entity': 'PHOTO',
                'photographer': email,
                'event': event,
                'name': fileName,
                'filePath': filePath,
                'location': photo.Location
            }
            this.savePhotoDB(item);
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
    async analyzePhoto(bucketName, Key) {
        try {
            var detectPhotos = new AnalyzePhoto(bucketName, Key);
            var labels = await detectPhotos.getLabel();
            var texts = await detectPhotos.getText();
            var params = {
                Bucket: bucketName,
                Key: Key
            };
            var metadata = await s3Client.headObject(params).promise();
            console.log("Metadata: ", metadata.Metadata);
            var tagging = await s3Client.getObjectTagging(params).promise();
            console.log("Tagging: ", tagging);

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
            var item = {
                'mainkey': metadata.Metadata.session,
                'mainsort': metadata.Metadata.photoID,
                'Tagging':{'Label':labels,'Text':texts}
            }
            this.savePhotoDB(item);
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
    async savePhotoDB(item) {
        try {
            var params = {
                TableName: this.DYNAMODBTABLE,
                Item: item
            }
            return await dynamo.put(params).promise();
        } catch (error) {
            console.log("Someting Wrong in savePhotoDB ", error)
            return {
                statusCode: 409,
                data: result
            };
        }
    }
}
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
            var photoID='PHOTO-'+uuid;
            var filePath = "photoClient/" + event + "/" + session + "/" + fileName;
            var params = {
                Bucket: this.BUCKET,
                Body: body,
                Key: filePath,
                ContentType: contentType,
                Metadata: {
                    "Photographer": email,
                    "Session":session,
                    "Event":event,
                    "photoID":photoID
                },
                Tagging:{
                    "Session":session,
                    "Event":event
                }
            };
            var photo = await s3Client.upload(params).promise();
            this.savePhotoDB(photoID,session,event,fileName,filePath,email,photo.Location);
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
            console.log("Entro a  Photo.analyzePhoto",Key);
            var detectPhotos = new AnalyzePhoto(bucketName, Key);
            var labels = await detectPhotos.getLabel();
            var texts = await detectPhotos.getText();
            var params = {
                Bucket: bucketName,
                Key: Key
            };
            var metadata = await s3Client.getObjectAttributes(params).promise(); 
            console.log("Metadata: ",metadata);
            var tagging = await s3Client.getObjectTagging(params).promise();
            console.log("Tagging: ",tagging);
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
    async savePhotoDB(photoID,session,event,fileName,filePath,email,location) {
        try {
            var item ={
                'mainkey':session,
                'mainsort':photoID,
                'entity':'PHOTO',
                'photographer':email,
                'event':event,
                'name':fileName,
                'filePath':filePath,
                'location':location
            }
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
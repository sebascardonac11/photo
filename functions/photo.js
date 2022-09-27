const AWS = require('aws-sdk');
//AWS.config.update({ region: 'us-east-2' });

const s3Client = new AWS.S3();
const Str = require('@supercharge/strings');

const dynamo = new AWS.DynamoDB.DocumentClient();
module.exports = class Photo {
    BUCKET;
    DYNAMODBTABLE;
    SessionID;
    Key;
    PhotoID;
    Lables = [];
    Texts = [];
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
            var db = this.saveDB(item);
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
    async saveDB(item) {
        try {
            var params = {
                TableName: this.DYNAMODBTABLE,
                Item: item
            }
            return await dynamo.put(params).promise();
        } catch (error) {
            console.log("Someting Wrong in Photo.savePhotoDB ", error)
            return {
                statusCode: 409,
                data: result
            };
        }
    }
    async putTagging(Texts, Labes) {
        var params = { Bucket: bucketName, Key: Key };
        params.Tagging = {
            TagSet: [
                {
                    Key: "Labels",
                    Value: Labes
                },
                {
                    Key: "Texts",
                    Value: Texts
                },]
        }
        await s3Client.putObjectTagging(params).promise();
    }
    async loadMeta(key,texts,labels) {
        try {
            var metadata = await s3Client.headObject({ Bucket: this.BUCKET, Key: key }).promise();
            this.SessionID = metadata.Metadata.session;
            this.PhotoID = metadata.Metadata.photoid;
            this.Key = key;
            this.Texts.push(this.Texts);
            this.Lables.push(labels);
        } catch (error) {
            console.log("Something wrong in photo.loadMeta: ", error)
        }
    }
}
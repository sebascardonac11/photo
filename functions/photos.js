const AWS = require('aws-sdk');
AWS.config.update({
    maxRetries: 15,
    retryDelayOptions: { base: 500 }
});
//AWS.config.update({ region: 'us-east-2' });

const s3Client = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();
const Str = require('@supercharge/strings');
const Photo = require('./photo');
module.exports = class Photos {
    BUCKET;
    DYNAMODBTABLE;

    constructor(bucket, table) {
        this.BUCKET = bucket;
        this.DYNAMODBTABLE = table;
    }
    async getPhotosPerson(event, number) {
        try {
            var photosDB = this.getPhotoEvent(event);
            var resPhoto = [];
            for (const i in photosDB.Items) {
                var photo = new Photo(this.BUCKET, this.DYNAMODBTABLE);
                photo.loadPhotoFromJson(photosDB.Items[i]);

                if (await photo.findPerson(number)) {
                    var filePath = photosDB.Items[i].filePath.replace('photoClient', 'thumbnail');
                    const presignedURL = s3Client.getSignedUrl('getObject', {
                        Bucket: this.BUCKET,
                        Key: filePath,
                        Expires: 10
                    });
                    photo.filePath = filePath
                    photo.Location = presignedURL;
                    console.log("photo", photo);
                    photosDB.Items[i].location = presignedURL;
                    resPhoto.push(photo);
                }
            }
            return {
                statusCode: 200,
                data: { Items: resPhoto }
            }
        } catch (error) {
            console.log("Someting Wrong in Photo.getPhotosPerson ", error)
            return {
                statusCode: 400,
                data: "Someting Wrong in Photo.getPhotosPerson "
            };
        }
    }
    async getPhotosSession(session, event) {
        try {
            var photosDB = this.getPhotoEvent(event);
            return {
                statusCode: 200,
                data: photosDB
            }
        } catch (error) {
            console.log("Someting Wrong in Photo.getPhotosSession ", error)
            return {
                statusCode: 400,
                data: "Someting Wrong in Photo.getPhotosSession "
            };
        }
    }
    async findPerson(number, Item) {
        console.log("PhotoNumber", Item)
        var isPerson = false;
        for (const key in Item.numbers) {
            if (Item.numbers[key] == number)
                isPerson = true;
        }
        return isPerson;
    }
    async getPhotoEvent(event) {
        try {
            var params = {
                TableName: this.DYNAMODBTABLE,
                ExpressionAttributeValues: {
                    ':hashKey': event,
                    ':entity': 'PHOTO'
                },
                KeyConditionExpression: 'mainkey =:hashKey',
                FilterExpression: 'entity=:entity'
            }
            return await dynamo.query(params).promise();
        } catch (error) {
            console.log("Someting Wrong in Photo.getPhotoEvent ", error)
            return {
                statusCode: 400,
                data: "Someting Wrong in Photo.getPhotoEvent "
            };
        }
    }
}
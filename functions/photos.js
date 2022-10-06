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
            var photosDB = await this.getPhotoEvent(event);
            var resPhoto = [];
            for (const i in photosDB) {
                if (await photosDB[i].findPerson(number)) {
                    var filePath = photosDB[i].Key.replace('photoClient', 'thumbnail');
                    const presignedURL = s3Client.getSignedUrl('getObject', {
                        Bucket: this.BUCKET,
                        Key: filePath,
                        Expires: 10
                    });
                    photosDB[i].Location = presignedURL;
                    console.log("Foto agregada",photosDB[i])
                    resPhoto.push(photosDB[i]);
                }
            }
            return {
                statusCode: 200,
                data: { Items: resPhoto }
            }
        } catch (error) {
            console.log("Someting Wrong in Photos.getPhotosPerson ", error)
            return {
                statusCode: 400,
                data: "Someting Wrong in Photos.getPhotosPerson "
            };
        }
    }
    async getPhotosSession(session, event) {
        try {
            var photosDB = await this.getPhotoEvent(event);
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
            var photosDB= await dynamo.query(params).promise();
            var photos=[];
            for (const i in photosDB.Items) {
                var photo = new Photo(this.BUCKET, this.DYNAMODBTABLE);
                photo.loadPhotoFromJson(photosDB.Items[i]);
                photos.push(photo);
            }
            return photos;
        } catch (error) {
            console.log("Someting Wrong in Photo.getPhotoEvent ", error)
            return {
                statusCode: 400,
                data: "Someting Wrong in Photo.getPhotoEvent "
            };
        }
    }
}
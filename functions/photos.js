const AWS = require('aws-sdk');
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
            var params = {
                TableName: this.DYNAMODBTABLE,
                ExpressionAttributeValues: {
                    ':hashKey': event,
                    ':entity': 'PHOTO'
                },
                KeyConditionExpression: 'mainkey =:hashKey',
                FilterExpression: 'entity=:entity'
            }
            var photosDB = await dynamo.query(params).promise();
            var resPhoto=[];
            for (const i in photosDB.Items) {
                var photo = new Photo(this.BUCKET,this.DYNAMODBTABLE); 
                photo.loadPhotoFromJson(photosDB.Items[i]);
                if (await photo.findPerson(number)) {
                    const presignedURL = s3Client.getSignedUrl('getObject', {
                        Bucket: this.BUCKET,
                        Key: photosDB.Items[i].filePath,
                        Expires: 10
                    });
                    photo.location=presignedURL;
                    console.log("photo",photo);
                    photosDB.Items[i].location = presignedURL;
                    resPhoto.push(photosDB.Items[i]);
                }
            }
            console.log("resPhoto",resPhoto)
            return {
                statusCode: 200,
                data: {Items:resPhoto}
            }
        } catch (error) {
            console.log("Someting Wrong in Photo.getPhotosPerson ", error)
            return {
                statusCode: 400,
                data: "Someting Wrong in Photo.getPhotosPerson "
            };
        }
    }
    async findPerson(number,Item) {
        console.log("PhotoNumber",Item)
        var isPerson=false;
        for (const key in Item.numbers) {
            if(Item.numbers[key]==number)
                isPerson = true;
        }
        return isPerson;
    }
}
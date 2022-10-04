const AWS = require('aws-sdk');
//AWS.config.update({ region: 'us-east-2' });
AWS.config.update({
    maxRetries: 15,
    retryDelayOptions: { base: 500 }
});
const s3Client = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();
const Str = require('@supercharge/strings');
module.exports = class Photo {
    BUCKET;
    DYNAMODBTABLE;
    SessionID;
    Key;
    PhotoID;
    Photographer;
    FileName;
    Location;
    Date;
    Event;
    Lables = [];
    Texts = [];
    Numbers = [];
    constructor(bucket, table) {
        this.BUCKET = bucket;
        this.DYNAMODBTABLE = table
        this.Entity = 'PHOTO';
    }
    async loadPhotoFromJson(obj) {
        this.SessionID = obj['session'];
        this.Key = obj['filePath'];
        this.PhotoID = obj['mainsort'];
        this.Photographer = obj['photographer'];
        this.FileName = obj['name'];
        this.Location = obj['location'];
        this.Event = obj['mainkey'];
        this.Lables = obj['labels'];
        this.Texts = obj['texts'];
        this.Numbers = obj['numbers'];
        this.Date = obj['date']
    }
    async loadDB() {
        try {
            var params = {
                TableName: this.DYNAMODBTABLE,
                KeyConditionExpression: 'mainkey = :hashKey and mainsort = :hasSort',
                ExpressionAttributeValues: {
                    ':hashKey': this.Event,
                    ':hasSort': this.PhotoID
                }
            }
            var thisPhoto = await dynamo.query(params).promise();
            if (thisPhoto.Count > 0) {
                this.Location = thisPhoto.Items[0].location
                this.FileName = thisPhoto.Items[0].name
                this.Date = thisPhoto.Items[0].date
            }
        } catch (error) {
            console.log("Someting Wrong in Photo.loadDB ", error)
            return null;
        }
    }
    async putPhoto(fileName, contentType, body, email, event, session) {
        try {
            var date = new Date();
            this.Date= date.getUTCFullYear() + '/' + date.getMonth() + '/' + date.getDay();
            this.SessionID = session;
            this.Photographer = email;
            this.Event = event
            this.FileName = fileName
            const uuid = Str.uuid();
            this.PhotoID = 'PHOTO-' + uuid;
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
                    "photoID": this.PhotoID
                }
            };
            var photo = await s3Client.upload(params).promise();
            this.Location = photo.Location;
            var db = this.saveDB();
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
    async saveDB() {
        try {
            
            var item = {
                'mainkey': this.Event,
                'mainsort': this.PhotoID,
                'date': this.Date,
                'entity': this.Entity,
                'photographer': this.Photographer,
                'session': this.SessionID,
                'name': this.FileName,
                'filePath': this.Key,
                'location': this.Location,
                'numbers': this.Numbers,
                'texts': this.Texts,
                'labels': this.Lables
            }
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
    async loadMeta(key, texts, numbers, labels) {
        try {
            var metadata = await s3Client.headObject({ Bucket: this.BUCKET, Key: key }).promise();
            this.SessionID = metadata.Metadata.session;
            this.PhotoID = metadata.Metadata.photoid;
            this.Event = metadata.Metadata.event;
            this.Photographer = metadata.Metadata.photographer;
            this.Key = key;
            this.Texts.push(texts);
            this.Lables.push(labels);
            this.Numbers = numbers
            await this.loadDB();
            await s3Client.putObjectTagging({
                Bucket: this.BUCKET, Key: key,
                Tagging: {
                    TagSet: [
                        {
                            Key: "Labels",
                            Value: labels
                        },
                        {
                            Key: "Texts",
                            Value: texts
                        },]
                }
            }).promise();
        } catch (error) {
            console.log("Something wrong in photo.loadMeta: ", error)
        }
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
            var resPhoto = [];
            for (const i in photosDB.Items) {
                if (await this.findPerson(number, photosDB.Items[i])) {
                    const presignedURL = s3Client.getSignedUrl('getObject', {
                        Bucket: this.BUCKET,
                        Key: photosDB.Items[i].filePath,
                        Expires: 10
                    });
                    photosDB.Items[i].location = presignedURL;
                    resPhoto.push(photosDB.Items[i]);
                }
            }
            console.log("resPhoto", resPhoto)
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
    async findPerson(number) {
        var isPerson = false;
        for (const key in this.Numbers) {
            if (this.Numbers[key] == number)
                isPerson = true;
        }
        return isPerson;
    }
    async createThumbnail() {
        const sharp = require('sharp');
        // Download the image from the S3 source bucket.
        try {
            const params = {
                Bucket: this.BUCKET,
                Key: this.Key
            };
            var origimage = await s3Client.getObject(params).promise();

        } catch (error) {
            console.log(error);
            return;
        }

        // set thumbnail width. Resize will set the height automatically to maintain aspect ratio.
        const width = 100;
        // Use the sharp module to resize the image and save in a buffer.
        try {
            var buffer = await sharp(origimage.Body).resize(width).toBuffer();

        } catch (error) {
            console.log(error);
            return;
        }
        // Upload the thumbnail image to the destination bucket
        try {
            var filePath = "thumbnail/" + this.Event + "/" + this.session + "/" + this.FileName;
            const destparams = {
                Bucket: this.BUCKET,
                Key: filePath,
                Body: buffer,
                ContentType: "image"
            };
            console.log("Img thumbnail",destparams)
            const putResult = await s3Client.putObject(destparams).promise();
        } catch (error) {
            console.log(error);
            return;
        }



    }
}
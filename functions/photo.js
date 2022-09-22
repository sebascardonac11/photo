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
           var db= this.saveDB(item);
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
            var metadata = await s3Client.headObject({ Bucket: bucketName,Key: Key}).promise();
            var sessionID= metadata.Metadata.session;
            var photoID=metadata.Metadata.photoid

            var personsDB=await this.getPersonPhoto(sessionID);
            var detectPhotos = new AnalyzePhoto(bucketName, Key);
            var labels = await detectPhotos.getLabel();
            var texts = await detectPhotos.getText();
            
            var personsPhoto = await detectPhotos.searchUser(labels,texts,personsDB.Items);
            var params = {Bucket: bucketName,Key: Key};
            params.Tagging = {
                TagSet: [
                    {
                        Key: "Labels",
                        Value: labels.labelsTags
                    },
                    {
                        Key: "Texts",
                        Value: texts.texts
                    }]
            }
            await s3Client.putObjectTagging(params).promise();
            console.log("Personas en foto: ",personsPhoto)
            if (personsPhoto.length==0){
                const uuid = Str.uuid();
                var personID = 'PERSON-' + uuid;
                var item = {
                    'mainkey': sessionID,
                    'mainsort': personID,
                    'entity':'PERSON',
                    'photo':photoID
                }

                console.log("Guardando persona",item)
                this.saveDB(item);
            }
           /* var item = {
                'mainkey': metadata.Metadata.session,
                'mainsort': metadata.Metadata.photoid,
                'Tagging':{'Label':labels.labelsTags,'Text':texts.texts}
            }
            this.savePhotoDB(item);*/
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
    async getPersonPhoto(sessionID){
        try {
            var params = {
                TableName: this.DYNAMODBTABLE,
                ExpressionAttributeValues: {
                    ':hashKey': sessionID,
                    ':entity':'PERSON'
                },
                KeyConditionExpression: 'mainkey =:hashKey',
                FilterExpression:'entity=:entity'
            }
            return await dynamo.query(params).promise();
        } catch (error) {
            console.log("Someting Wrong in Photo.getPersonPhoto ", error)
            return {
                statusCode: 409,
                data: error
            };
        }
    }
}
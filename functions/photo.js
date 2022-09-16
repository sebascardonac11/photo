const AWS = require('aws-sdk');
const s3Client = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports = class Photo {
    BUCKET;
    constructor(bucket) {
        this.BUCKET = bucket;
      }

    async putPhoto(fileName, contentType, body, email,event,session) {
        try {
            var filePath = "photoClient/" +event+"/"+session+"/"+ fileName
            var params = {
                Bucket: "photoevent",
                Body: body,
                Key: filePath,
                ContentType: contentType,
                Metadata: {
                    "Photographer": email
                }
            };
            var item={'photographer':email,'session':session,'key':fileName}
            var photoDB=await this.insertPhotoDB(item);
            console.log('DB: ',photoDB);
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
                TableName: "photoEvent-Dynamo-photo",
                Item: Item
            }
            var result = await dynamo.put(params).promise();
        } catch (error) {
            console.log("Something wrong in photo.insertPhotoDB: ", error);
        }
    }

}
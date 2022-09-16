const AWS = require('aws-sdk');
const s3Client = new AWS.S3();
module.exports = class Photo {
    async putPhoto(fileName, contentType, body, email) {
        try {
            var filePath = "photoClient/" + fileName
            var params = {
                Bucket: "photoevent",
                Body: body,
                Key: filePath,
                ContentType: contentType,
                Metadata: {
                    "Photographer": email
                }
            };
            var photo = await s3Client.upload(params).promise();
            return {
                statusCode: 200,
                data: photo
            }
        } catch (error) {
            console.log("Something wrong in session.putPhoto: ", error)
            return {
                statusCode: 404,
                data: error
            }
        }
    }
}
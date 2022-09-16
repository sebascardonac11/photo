const Photo = require('./functions/photo')
const jwt_decode = require('jwt-decode');
const parser = require('lambda-multipart-parser');
exports.handler = async function (event, context, callback) {
    console.log("Event Photo: ", event);
    var photo = new Photo();
    var authorizationDecoded = jwt_decode(event.headers.Authorization);
    this.response.statusCode=401;
    switch (event.httpMethod) {
        case 'PUT':
            console.log("### PUT ####");
            const form = await parser.parse(event);
            var key = form.event + '/' + form.session + '/' + form.files[0].filename;
            var contenType = form.files[0].contentType;
            var body = Buffer.from(form.files[0].content);
            this.response = await photo.putPhoto(key, contenType, body, authorizationDecoded.email);
            break;
        default:
              console.log("Without httpMethod");
    }
    console.log("Response: ", this.response);
    return {
      statusCode: this.response.statusCode,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
        "Content-Type": 'application/json'
      },
      body: JSON.stringify(this.response.data)
    };
}
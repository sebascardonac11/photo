const Photo = require('./functions/photo')
const jwt_decode = require('jwt-decode');
const parser = require('lambda-multipart-parser');
exports.handler = async function (event, context, callback) {
    console.log("Event Photo: ", event);
    console.log("Context Photo: ", context);
    console.log("callback Photo: ", callback);
    var photo = new Photo(process.env.BUCKET,process.env.DYNAMODB);
    var response={statusCode: 401,data: "Whitout Information"};
    switch (event.httpMethod) {
        case 'PUT':
            console.log("### PUT ####");
            var authorizationDecoded = jwt_decode(event.headers.Authorization);
            const form = await parser.parse(event);
            var key = form.event + '/' + form.session + '/' + form.files[0].filename;
            var contenType = form.files[0].contentType;
            var body = Buffer.from(form.files[0].content);
            response = await photo.putPhoto(form.files[0].filename, contenType, body, authorizationDecoded.email,form.event,form.session);
            break;
        default:
              console.log("Without httpMethod");
    }
    console.log("Response: ", response);
    return {
      statusCode: response.statusCode,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT",
        "Content-Type": 'application/json'
      },
      body: JSON.stringify(response.data)
    };
}
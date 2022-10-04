const index = require('../index');
var event = {
    "Records": [
        {
            "s3": {
                "s3SchemaVersion": "1.0",
                "configurationId": "addTags",
                "bucket": {
                    "name": "photoeventdev",
                    "ownerIdentity": {
                        "principalId": "ASGGTID7KBSF4"
                    },
                    "arn": "arn:aws:s3:::photoeventdev"
                },
                "object": {
                    "key": "photoClient/EVENT-12bf90bf-95a6-4692-bc04-4b19a5b0aa65/SESSION-8295f7d0-40a1-4a3f-92a6-758d9a3322de/SCC_0043.jpg",
                    "size": 1350382,
                    "eTag": "8352b2810016fe2ca0f1355720a73897",
                    "sequencer": "00632DC113F71CEEA8"
                }
            }
        }
    ]
}

//var SessionID='SESSION-8295f7d0-40a1-4a3f-92a6-758d9a3322de'
//console.log(SessionID.split('SESSION-'));
//index.handler(event,{},{});
var key= "photoClient/EVENT-12bf90bf-95a6-4692-bc04-4b19a5b0aa65/SESSION-7c246f59-2d22-4278-9fa3-48d06601172e/SCC_0530.jpg";
key = key.replace('photoClient', 'thumbnail');
console.log(key);
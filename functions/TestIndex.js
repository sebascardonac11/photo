const index = require('../index');
var event = {
    "Records": [
        {
            "eventVersion": "2.1",
            "eventSource": "aws:s3",
            "awsRegion": "us-east-2",
            "eventTime": "2022-09-16T23:37:55.037Z",
            "eventName": "ObjectCreated:Put",
            "userIdentity": {
                "principalId": "ASGGTID7KBSF4"
            },
            "requestParameters": {
                "sourceIPAddress": "181.62.52.69"
            },
            "responseElements": {
                "x-amz-request-id": "Y6EJ1Z3Y5E7MMWCR",
                "x-amz-id-2": "mNgzH/pVKywtswILvv3uUJxT543POHgaUZn+glktAE1WESlk4l0cLi7pD3F+nQ83OOZudS9YOse/gu6w7PK9cGeRgucI3CyR"
            },
            "s3": {
                "s3SchemaVersion": "1.0",
                "configurationId": "analyzePhoto",
                "bucket": {
                    "name": "photoeventdev",
                    "ownerIdentity": {
                        "principalId": "ASGGTID7KBSF4"
                    },
                    "arn": "arn:aws:s3:::photoeventdev"
                },
                "object": {
                    "key": "photoClient/SCC_0043.jpg",
                    "size": 1276756,
                    "eTag": "63596c9220e206a5dd00a6d65639076e",
                    "sequencer": "00632508D2EF1128E1"
                }
            }
        }
    ]
}


index.handler(event,{},{});
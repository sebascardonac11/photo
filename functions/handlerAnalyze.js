const AWS = require('aws-sdk');
//AWS.config.update({ region: 'us-east-2' });

const Dynamo = new AWS.DynamoDB.DocumentClient();
const Rekognition = new AWS.Rekognition();
const Str = require('@supercharge/strings');

const Photo = require("./photo");
const Person = require('./person');
const Unclassified = require('./unClassified');

module.exports = class handlerAnalyze {
    unClassified;
    constructor(event, bucket, table) {
        this.event = event;
        this.bucket = bucket;
        this.table = table
    }
    async analyse(key) {
        try {
            const uuid = Str.uuid();
            var personID = 'PERSON-' + uuid;
            // Identify photo
            var texts = await this.findRekognitionText(key);
            var labels = await this.findRekognitionLabels(key);
            var photo = new Photo(this.bucket, this.table);
            await photo.loadMeta(key, texts.texts,texts.arrayNumbers, labels.labelsTags);
            photo.saveDB();

            //Get persons of sessions
            var personsDB = await this.getPersons(photo.SessionID, photo)
            
            var i = 0;
            for (i in personsDB) {
                if (personsDB[i].analyzeText(texts.texts)) {
                    personsDB[i].addPhoto(photo.PhotoID);
                    personsDB[i].saveDB();
                }
            }
            if (i == 0) {
                if (this.unClassified) {
                    var ind = await this.unClassified.analyzeText(texts);
                    if (ind == -1) {
                        //Put photo in unclassified category
                        this.unClassified.addPhoto(photo.PhotoID, texts.texts, labels.labelsTags, texts.arrayNumbers);
                        this.unClassified.saveDB();
                    }else{
                        var person = new Person(photo.SessionID,personID,texts.texts,labels.labelsTags,text.arrayNumbers,this.table);
                        person.addPhoto(photo.PhotoID);
                        var photoUnClassified = await this.unClassified.getPhoto(ind);
                        person.addPhoto(photoUnClassified);
                        person.saveDB();
                        this.unClassified.deletePhoto(ind);
                        this.unClassified.saveDB();
                    }
                } else {
                    //Put photo in unclassified category
                    this.saveUnClassified(photo, texts, labels);
                }
            }
        } catch (error) {
            console.log("Something wrong in handlerAnalyze.analyse: ", error)
            return {
                statusCode: 404,
                data: error
            }
        }
    }
    async saveUnClassified(photo, texts, labels) {
        var unclassifiedID = 'PERSON-' + photo.SessionID.split('SESSION-')[1]
        this.unClassified = new Unclassified();
        this.unClassified.load(photo.SessionID, unclassifiedID, texts.texts, labels.labelsTags,photo.PhotoID ,texts.arrayNumbers,this.table);
        this.unClassified.saveDB();
    }
    async getPersons(sessionID, photo) {
        try {
            var params = {
                TableName: this.table,
                ExpressionAttributeValues: {
                    ':hashKey': sessionID,
                    ':entity': 'PERSON'
                },
                KeyConditionExpression: 'mainkey =:hashKey',
                FilterExpression: 'entity=:entity'
            }
            var personsDB = await Dynamo.query(params).promise();
            var persons = [];
            for (const key in personsDB.Items) {
                if (personsDB.Items[key].mainsort != 'PERSON-' + photo.SessionID.split('SESSION-')[1]) {
                    var person = new Person();
                    await person.load(personsDB.Items[key].mainkey,
                        personsDB.Items[key].mainsort,
                        personsDB.Items[key].texts,
                        personsDB.Items[key].labels,
                        personsDB.Items[key].numbers,
                        personsDB.Items[key].photo, this.table);
                    persons.push(person);
                } else {
                    this.unClassified = new Unclassified(
                        personsDB.Items[key].mainkey,
                        personsDB.Items[key].mainsort,
                        personsDB.Items[key].texts,
                        personsDB.Items[key].labels,
                        personsDB.Items[key].photo,
                        personsDB.Items[key].numbers,
                         this.table);
                }
            }
            return persons
        } catch (error) {
            console.log("Someting Wrong in handlerAnalyze.getPersons ", error)
            return [];
        }
    }
    /**
   * This function, go to rekognition to getTexts of this photo.
   */
    async findRekognitionText(key) {
        try {
            const paramsText = {
                Image: {
                    S3Object: {
                        Bucket: this.bucket,
                        Name: key
                    }
                }
            };
            const data = await Rekognition.detectText(paramsText).promise();
            var texts = ""
            var arrayTexts = []
            var arrayNumbers = []
            data.TextDetections.forEach(text => {
                const onlyLetters = text.DetectedText.replace(/[0-9]+/g, ""); // esto retorna 'abcd'
                const onlyNumbers = text.DetectedText.replace(/[^0-9]+/g, "");
                onlyLetters.toUpperCase;
                if (texts.search(onlyLetters) == -1 && onlyLetters != '') {
                    texts += onlyLetters + "-";
                    arrayTexts.push(onlyLetters);

                }
                if (texts.search(onlyNumbers) == -1 && onlyNumbers != '') {
                    texts += onlyNumbers + "-";
                    arrayNumbers.push(onlyNumbers);
                }
            });
            return { 'texts': texts, 'arrayTexts': arrayTexts, 'arrayNumbers': arrayNumbers };
        } catch (error) {
            console.log("Something wrong in handlerAnalyze.findRekognitionText: ", error)
        }
    }
    /**
     * This function, go to rekognition to getLabels of this photo. 
     */
    async findRekognitionLabels(key) {
        try {
            const params = {
                Image: {
                    S3Object: {
                        Bucket: this.bucket,
                        Name: key
                    },
                },
                MaxLabels: 10
            }
            var labelsTags = "";
            var arraylabels = []
            const data = await Rekognition.detectLabels(params, function (err, data) { if (err) console.log(err, err.stack); }).promise();
            data.Labels.forEach(label => {
                if (labelsTags.search(label.Name) == -1) {
                    labelsTags += label.Name + "-";
                    arraylabels.push(label.DetectedText);
                }
            });

            return { 'labelsTags': labelsTags, arrayTags: arraylabels };
        } catch (error) {
            console.log("Something wrong in handlerAnalyze.findRekognitionLabels: ", error)
        }
    }

}
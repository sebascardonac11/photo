const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-2' });
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports = class Person {
    DYNAMODBTABLE;
    mainsort;
    mainkey;
    entity = 'PERSON';
    photos = [];
    labels = [];
    texts = [];
    isUnClassified = false;
    constructor( sessionID,personID,texts,labels,table) {
        this.DYNAMODBTABLE = table
        this.mainkey=sessionID;
        this.mainsort=personID;
        this.texts.push(texts);
        this.labels.push(labels);
    }
    async load(sessionID,personID,texts,labels,photos,table) {
        this.DYNAMODBTABLE = table
        this.mainkey=sessionID;
        this.mainsort=personID;
        this.texts= texts;
        this.labels = labels;
        this.photos = photos;
    }
    /**
     * Return if texts are  in texts of the person.
     */
    async analyzeText(Texts) {
        var photos = false
        for (const i in this.texts) {
            var pos = -1;//Texts.indexOf(this.texts[i]);
            if (pos != -1) {
                photos= true;
            }
        }
        console.log('Textos Encontrados en las siguientes fotos: ', Texts);
        return photos;
    }
    async saveDB() {
        try {
            var params = {
                TableName: this.DYNAMODBTABLE,
                Item:{
                    'mainkey': this.mainkey,
                    'mainsort': this.mainsort,
                    'entity': this.entity,
                    'photo': this.photos,
                    'texts': this.texts,
                    'labels': this.labels
                }
            }
            return await dynamo.put(params).promise();
        } catch (error) {
            console.log("Someting Wrong in Person.saveDB ", error)
            return {
                statusCode: 409,
                data: result
            };
        }
    }
    async addPhoto(photo){
        this.photos.push(photo);
    }
    async addTexts(Texts){
        if(this.isUnClassified){
            this.texts.push(Texts);
        }else{
            console.log("Falta desarrollar person.addTexts")
        }
    }
}
const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-2' });
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports = class Unclassified {
    DYNAMODBTABLE;
    mainsort;
    mainkey;
    entity = 'PERSON';
    photos = [];
    labels = [];
    texts = [];
    numbers=[];
    constructor(sessionID,personID,texts,labels,photos,numbers,table) {
        this.DYNAMODBTABLE = table
        this.mainkey=sessionID;
        this.mainsort=personID;
        this.texts=texts;
        this.labels=labels;
        this.numbers=numbers;
        this.photos=photos;
    }
    async load(sessionID,unclassifiedID,texts,labels,photos,numbers,table) {
        this.DYNAMODBTABLE = table
        this.mainkey=sessionID;
        this.mainsort=unclassifiedID;
        this.texts=[]
        this.texts.push(texts);
        this.labels=[]
        this.labels.push(labels);
        this.photos=[]
        this.photos.push(photos);
        this.numbers=[]
        this.numbers.push(numbers);
    }

    /**
     * Return if texts are  in texts of the person.
     */
    async analyzeText(Texts) {
        var pos = -1;
        var text ="";
        for (const i in this.texts) {
            text=this.texts[i];
            if (text.search(Texts.texts) != -1) {
                pos= i;
            }
        }
        return pos;
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
                    'labels': this.labels,
                    'numbers':this.numbers
                }
            }
            return await dynamo.put(params).promise();
        } catch (error) {
            console.log("Someting Wrong in Unclassified.saveDB ", error)
            return {
                statusCode: 409,
                data: result
            };
        }
    }
    async addPhoto(photo,text,label,number){
        this.photos.push(photo);
        this.texts.push(text);
        this.labels.push(label);
        this.numbers.push(number);
    }
    async getPhoto(index){
        return this.photos[index];
    }
    async deletePhoto(index){
        this.photos.splice(index, 1);
        this.labels.splice(index, 1);
        this.texts.splice(index, 1);
        this.numbers.splice(index, 1);
    }
    async addTexts(Texts){
        if(this.isUnClassified){
            this.texts.push(Texts);
        }else{
            console.log("Falta desarrollar person.addTexts")
        }
    }
}
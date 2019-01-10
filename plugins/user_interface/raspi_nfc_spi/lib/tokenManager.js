const lokijs = require('lokijs');
const DB_VERSION = 1;
class TokenManager {

    constructor(filePath='./data/tokenmanager.db', logger=console) {
        this.db = new lokijs(filePath, {
            autosave: true, 
            autosaveInterval: 4000
        });

        this.tokens = this.db.addCollection('tokens');
        this.metadata = this.db.addCollection('metadata');
        
        const currentVersion = this.metadata.findOne({id: 'version'});

        if(!currentVersion){
            this.metadata.insertOne({id: 'version', value: DB_VERSION});
        }
    }

    registerToken(uid, playlist){
        const assignment = this.tokens.findOne({uid});
        if(!assignment){
            this.tokens.insertOne({uid, playlist});
        } else {
            throw new Error('token already assigned - unassign first')
        }
    }

    unassignToken(uid){
        const assignment = this.tokens.findOne({uid});
        if(!assignment){
            throw new Error('token not assigned')
        } else {
            this.tokens.removeWhere({uid});
        }
    }
}

module.exports = TokenManager;
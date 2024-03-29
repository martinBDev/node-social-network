const {ObjectId} = require("mongodb");
module.exports = {

    mongoClient: null,
    app: null,
    init: function ( app, mongoClient ){
        this.mongoClient = mongoClient;
        this.app = app;
    },
    createUser: async function (user){

        try {
            const client = await this.mongoClient
                .connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);
            let userComplete = {
                ...user,
                invitesSent: [],
                invitesReceived: [],
                friendships:[]
            }
            const result = await usersCollection.insertOne(userComplete);
            client.close();
            return result.insertedId;
        } catch (error) {
            throw (error);

        }

    },
    findUser: async function (filter, options) {
        try {

            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);
            const users = await usersCollection.find(filter, options).toArray();
            client.close();
            return users;
        } catch (error) {
            throw (error);
        }
    },
    findUserByStringId: async function (stringId){
        try {

            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);
            const users = await usersCollection.find({_id:ObjectId(stringId)}, {}).toArray();
            client.close();
            return users;
        } catch (error) {
            throw (error);
        }
    },
    findInvitesReceivedByUser: async function ( receiver, page, limit ){

        try {
            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);

            //Encontramos a todos los usuarios que le han mandado invitación a ese usuario
            let invitesReceived = await usersCollection.find({'_id': {'$in' : receiver.invitesReceived}}).toArray();

            //En qué invitación empieza la página
            let startOfPage = (page-1)*limit;

            let invitesArray; //Array de invitaciones a devolver
            let totalInvitesToUser = 0; //Numero total de invitaciones
            //Si hay invitaciones a ese usuario
            if(invitesReceived.length > 0){
                invitesArray = invitesReceived.slice(startOfPage, startOfPage+limit )
                totalInvitesToUser = invitesReceived.length;
            }
            client.close();
            return {invitesReceived: invitesArray, total: totalInvitesToUser};
        } catch (error) {
            throw (error);
        }

    },
    findFriendsOfUser: async function ( user, page, limit ){

        try {
            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);

            //Encontramos a todos los usuarios que son amigos ese usuario
            let friendships = await usersCollection.find({'_id': {'$in' : user.friendships}}).toArray();

            //En qué amistad empieza la página
            let startOfPage = (page-1)*limit;

            let friendsArray; //Array de amistades a devolver
            let totalFriendsOfUser = 0; //Numero total de amistades
            //Si tiene amistades ese usuario
            if(friendships.length > 0){
                friendsArray = friendships.slice(startOfPage, startOfPage+limit )
                totalFriendsOfUser = friendships.length;
            }
            client.close();
            return {friendships: friendsArray, total: totalFriendsOfUser};
        } catch (error) {
            throw (error);
        }

    },
    sendInvite: async function(senderObjectID, receiverObjectID) {
        try {
            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);


            //Encuentra el usuario con ObjectID --> miraremos el emisor primero
            let filterUsers = {_id: senderObjectID};

            //Actualizamos la lista de peticiones enviadas por el emisor, añadimos el id del receptor
            await usersCollection.update(filterUsers, {$push: { invitesSent: receiverObjectID } } );


            /////////HACEMOS LO MISMO CON EL RECEPTOR: AÑADIMOS LA INVITACIÓN RECIBIDA

            //Encuentra el usuario con ObjectID --> miraremos el RECEPTOR
            filterUsers = {_id: receiverObjectID};

            //Actualizamos la lista de peticiones enviadas por el emisor, ahora contiene la enviada al receptor
            await usersCollection.update(filterUsers, {$push: { invitesReceived: senderObjectID } } );


        } catch (error) {
            throw (error);
        }
    },
    acceptInvite: async function ( senderObjectID, receiverObjectID ){

        try {
            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);


            //Encuentra el usuario con ObjectID --> miraremos el emisor primero
            let filterUsers = {_id: senderObjectID};

            //Actualizamos la lista de peticiones enviadas por el emisor, ahora ya no contiene la enviada al receptor
            await usersCollection.update(filterUsers, {$pull: { invitesSent: receiverObjectID } } );

            //Establecemos la amistad entre el emisor y el receptor
            await usersCollection.update(filterUsers, {$push: { friendships: receiverObjectID } } );

            /////////HACEMOS LO MISMO CON EL RECEPTOR: BORRAMOS LA INVITACIÓN RECIBIDA

            //Encuentra el usuario con ObjectID --> miraremos el RECEPTOR
            filterUsers = {_id: receiverObjectID};

            //Actualizamos la lista de peticiones enviadas por el emisor, ahora ya no contiene la enviada al receptor
            await usersCollection.update(filterUsers, {$pull: { invitesReceived: senderObjectID } } );

            //Establecemos la amistad entre el receptor y el emisor
            await usersCollection.update(filterUsers, {$push: { friendships: senderObjectID } } );
            client.close();


        } catch (error) {
            throw (error);
        }

    },
//Checkea que el usuario con ID MyObjectId es amigo de OtherUserObjectId
    isFriendOf: async function (MyObjectId, OtherUserObjectId) {
        try {

            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);

            const users = await usersCollection.find({_id: MyObjectId}, {}).toArray();
            const myself = users[0];
            let friendShipExists = false;
            for(let i = 0; i < myself.friendships.length; i++){
                if(myself.friendships[i].equals(OtherUserObjectId)){
                    friendShipExists = true;
                    break;
                }
            }
            client.close();
            return friendShipExists;
        } catch (error) {
            throw (error);
        }
    }
    ,
    getUsers: async function (filter, options) {
        try {
            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);
            const usersDoc = await usersCollection.find(filter, options).sort({email:1}).toArray();
            client.close();
            return usersDoc;
        } catch (error) {
            throw (error);
        }
    },getUsersPg: async function (filter, options, page) {
        try {
            const limit = 5;
            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);
            const usersFound = usersCollection.find(filter, options).sort({email:1});
            const usersCollectionCount = await usersFound.count();
            const cursor = usersFound.skip((page - 1) * limit).limit(limit);
            const users = await cursor.toArray();
            const result = {users: users, total: usersCollectionCount};
            client.close();
            return result;
        } catch (error) {
            throw (error);
        }
    },
    deleteUsers:async function (filter, options) {
        try {
            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);
            const result = await usersCollection.deleteMany(filter, options);
            client.close();
            return result;
        } catch (error) {
            throw (error);
        }
    },
    deleteFriendshipsAndInvites: async function(filter, options){
        try {
            const client = await this.mongoClient.connect(this.app.get('connectionStrings'));
            const database = client.db("redsocial");
            const collectionName = 'users';
            const usersCollection = database.collection(collectionName);
            const result = await usersCollection.updateMany(filter, options);
            client.close();
            return result;
        } catch (error) {
            throw (error);
        }
    }

}
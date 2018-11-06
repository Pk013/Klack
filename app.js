const express = require("express");
const querystring = require("querystring");
const app = express();
let mongoose = require('mongoose');

// var mongoUri = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/klack';

const dbName = 'pkShannon';
const DB_USER = 'Morthos';
const DB_PASSWORD = 'Kenzie101';
const DB_URI = 'ds129946.mlab.com:29946'


let messageSchema = mongoose.Schema({
    sender: String,
    message: String
})


let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));


let Message = mongoose.model('Message', messageSchema)

// List of all messages
let messages = [];

// Track last active times for each sender
let users = {};

app.use(express.static("./public"));
app.use(express.json());

// generic comparison function for case-insensitive alphabetic sorting on the name field
function userSortFn(a, b) {
    var nameA = a.name.toUpperCase(); // ignore upper and lowercase
    var nameB = b.name.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
        return -1;
    }
    if (nameA > nameB) {
        return 1;
    }

    // names must be equal
    return 0;
}

app.get("/messages", (request, response) => {
    // get the current time
    const now = Date.now();


    Message.find({}, function(err, messageArray) {

        messages = messageArray
        messageArray.forEach(name => {
            users[name.sender] = name.timestamp
        })

    })


    // consider users active if they have connected (GET or POST) in last 15 seconds
    const requireActiveSince = now - 15 * 1000;

    // create a new list of users with a flag indicating whether they have been active recently
    usersSimple = Object.keys(users).map(x => ({
        name: x,
        active: users[x] > requireActiveSince
    }));

    // sort the list of users alphabetically by name
    usersSimple.sort(userSortFn);
    usersSimple.filter(a => a.name !== request.query.for);

    // update the requesting user's last access time
    users[request.query.for] = now;

    // send the latest 40 messages and the full user list, annotated with active flags
    response.send({ messages: messages.slice(-40), users: usersSimple });
});

app.post("/messages", (request, response) => {
    // add a timestamp to each incoming message.
    const timestamp = Date.now()
    request.body.timestamp = timestamp

    messageDBObject = new Message({
        sender: request.body.sender,
        message: request.body.message,
        timestamp: timestamp
    })

    messageDBObject.save(function(err, userInfo) {
        if (err) return
        console.log('this is a message', messageDBObject)
    })
    messages.push(request.body)
        // append the new message to the message list

    // update the posting user's last access timestamp (so we know they are active)
    users[request.body.sender] = timestamp

    // Send back the successful response.
    response.status(201)
    response.send(request.body)
})

app.listen(process.env.PORT || 3000, () => {
    mongoose.connect(`mongodb://${DB_USER}:${DB_PASSWORD}@${DB_URI}/${dbName}`, { useNewUrlParser: true })
})
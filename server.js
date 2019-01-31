"use strict";

process.title = 'node-chat';

const express = require('express');
const app = express();
const webSocketServer = require('websocket').server;
const server = require('http').Server(app);

/**
 * Global variables
 */
const webSocketsServerPort = 8081;
let history = [];
let clients = [];

/**
 * Helper function for escaping input strings
 */
function htmlEntities(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * HTTP server
 */
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
    console.log('index.html requested');
    res.sendFile(__dirname + '/index.html');
});

server.listen(8081, function () {
    console.log(`${new Date()} Listening on ${server.address().port}`);
});

/**
 * WebSocket server
 */
const wsServer = new webSocketServer({
    httpServer: server
});
// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function (request) {
    console.log((new Date()) + ' Connection from origin \t' + request.origin + ' - ' + request.remoteAddress);

    //INSECURE
    const connection = request.accept(null, request.origin);


    // we need to know client index to remove them on 'close' event
    const index = clients.push(connection) - 1;


    let userName = false;

    // send back chat history
    if (history.length > 0) {
        connection.sendUTF(
            JSON.stringify({type: 'history', data: history}));
    }



    // user sent some message
    connection.on('message', function (message) {
        if (message.type === 'utf8') { // accept only text
            // first message sent by user is their name
            if (userName === false) {
                userName = htmlEntities(message.utf8Data);
                connection.sendUTF(JSON.stringify({type: 'confirmation', data: userName}));
                console.log((new Date()) + ' User is known as: ' + userName);

            } else {
                console.log((new Date()) + ' Received Message from '
                    + userName + ': ' + message.utf8Data);

                // we want to keep history of all sent messages
                const obj = {
                    time: (new Date()).getTime(),
                    text: htmlEntities(message.utf8Data),
                    author: userName
                };

                history.push(obj);
                history = history.slice(-100);
                // broadcast message to all connected clients
                const json = JSON.stringify({type: 'message', data: obj});
                for (let i = 0; i < clients.length; i++) {
                    clients[i].sendUTF(json);
                }
            }
        }
    });

    // user disconnected
    connection.on('close', function (connection) {
        if (userName !== false) {
            console.log((new Date()) + " Peer "
                + connection.remoteAddress + " disconnected. " + userName);
            // remove user from the list of connected clients
            clients.splice(index, 1);
        }
    });
});
process.env.DEBUG = "mediasoup"

const fs = require('fs')
const http = require('http')
const express = require('express')
const app = express()
const mediasoup = require('mediasoup')
const socketio = require('socket.io')

// Create an HTTPS server
const webServer = http.createServer(app).listen(3000, () => {
    console.log('Web server start running on port 3000')
})

// Create a socket.io server
const io = socketio(webServer)

// Create a map that links websocket ids with peer names
const participants = new Map()

// Create an Selective Forwarding Unit (SFU) server
const soupServer = mediasoup.Server({ logLevel: "debug" })
const mediaCodecs = [
    {
        kind: 'audio',
        name: 'opus',
        clockRate: 48000,
        channels: 2,
        parameters: {
            useinbandfec: 1
        }
    }
]
const room = soupServer.Room(mediaCodecs)

const disconnected = socket => {
    console.log(`Socket with id ${socket.id} disconnected`)
    if (participants[socket.id]) {
        room.getPeerByName(participants[socket.id]).close()
    }
}

const notify = notification => {
    console.log('Notification!', notification)
    const peerName = notification.peerName
    room.getPeerByName(peerName).receiveNotification(notification)
}

const request = (req, callback) => {
    console.log(`Received ${req.method} request`)
    switch (req.target) {
        case 'room':
            requestRoom(req, callback)
            break;
        case 'peer':
            requestPeer(req, callback)
            break;
    }
}

const requestPeer = (request, callback) => {
    console.log('  Forwarding request to peer: ' + request.peerName)
    const peerName = request.peerName
    room.getPeerByName(peerName)
        .receiveRequest(request)
        .then(callback)
}

const requestRoom = (request, callback) => {
    console.log('  Forwarding request to the room')
    room.receiveRequest(request)
        .then(callback)
        .catch(e => { console.log(e) })
}

const handlePeer = peer => {
    console.log('New peer: ' + peer.name)
    participants[peer.appData.socketId] = peer.name

    peer.on('notify', notification => {
        notification.peerName = peer.name
        notify(notification)
    })

    peer.on('close', () => {
        console.log(`Closed peer ${peer.name}`)
    })
}

room.on('newpeer', handlePeer)
room.on('close', () => {
    console.log('Room closed')
})

io.on('connection', socket => {
    console.log('New connection')
    socket.on('notify', notify)
    socket.on('request', request)
    socket.on('disconnect', () => { disconnected(socket) })
})
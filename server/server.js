const fs = require('fs')
const http = require('http')
const express = require('express')
const app = express()
const mediasoup = require('mediasoup')
const socketio = require('socket.io')

// Filepaths to SSL certificates for HTTPS
// const ssl = {
//   key: fs.readFileSync('./cert/server.key').toString(),
//   cert: fs.readFileSync('./cert/server.crt').toString()
// }

// Create an HTTPS server
const webServer = http.createServer(app).listen(3000, () => {
  console.log('Web server start running on port 3000')
})

// Create a socket.io server
const io = socketio(webServer)

// Create an Selective Forwarding Unit (SFU) server
const soupServer = mediasoup.Server()
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

io.on('connection', (client, message) => {
  console.log(`Client with id ${client.id} connected!`)

  client.on('message', message => {
    // Initial contact comes from browser as an offer
    if (message.type === 'mediasoup-request') {
      const request = message.body
      console.log(`Received ${request.method} request from client!`)

      if (request.method === 'queryRoom') {
        room
          .receiveRequest(request)
          .then(response => {
            console.log(`Sending response to ${request.method} request!`)
            client.send({ type: 'mediasoup-response', body: response })
          })
          .catch(e => {
            console.log('Error receiving request!', e)
          })
      } else if (request.method == 'join') {
        room
          .receiveRequest(request)
          .then(response => {
            client.send({ type: 'mediasoup-response', body: response })

            const { peerName } = request
            const peer = room.getPeerByName(peerName)
            handleNewPeer(peer)
          })
          .catch(e => {
            console.log('Error receiving request!', e)
          })
      } else if (request.method === 'createTransport') {
        console.log('Received request to creat a new transport!')
        room.peers.forEach(peer => {
          peer.on('newtransport', transport => {
            console.log('created new transport!')
          })
          peer
            .receiveRequest(request)
            .then(response => {
              console.log('Created new transport response')
              client.send({ type: 'mediasoup-response', body: response })
            })
            .catch(error => {
              console.log('Error creating transport', error)
            })
        })
      } else if (request.method === 'createProducer') {
        console.log('Received request to create new producer!', request)
        room.peers.forEach(peer => {
          console.log('Creating producer for ' + peer.name)
          peer.on('newproducer', producer => {
            console.log('New producer created!')
          })
          peer.on('newconsumer', consumer => {
            console.log('New consumer created!')
          })
          peer.receiveRequest(request).then(response => {
            client.send({ type: 'mediasoup-response', body: response })
          })
        })
      } else if (request.method === 'enableConsumer') {
        console.log('Received request to enable consumer!')
        room.peers.forEach(peer => {
          peer
            .receiveRequest(request)
            .then(response => {
              console.log('Enabled consumer!', response)
              client.send({ type: 'mediasoup-response', body: response })
            })
            .catch(error => {
              console.log('Error receiving request', error)
            })
        })
      } else {
        fatal('Uknown request type!', request.method)
      }
    }
  })

  client.on('disconnect', () => {
    console.log(`Client with id ${client.id} disconnected`)
  })

  client.on('error', error => {
    console.log(`Client error: ${error}`)
  })
})

function handleNewPeer(peer) {
  console.log(`${peer.name} joined the room!`)
}

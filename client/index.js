'use strict'

const io = require('socket.io-client')
const mediasoupClient = require('mediasoup-client')
const socket = io('http://localhost:3000')

socket.on('connect', () => {
  console.log('Connected!')
})
socket.on('disconnect', () => {
  console.log('Disconnected!')
})
socket.on('error', () => {
  console.log(error)
})
socket.on('notify', notification => {
  room.receiveNotification(notification)
})

room.on('request', (request, success) => {
  console.log('Request: ' + request.method)
  socket.emit('request', request, success)
})

room.on('notify', notification => {
  socket.emit('notify', notification)
})
room.on('newpeer', peer => {
  handlePeer(peer)
})

const handlePeer = peer => {
  peer.on('notify', notification => {
    notification.peerName = peer.name
    socket.emit('notify', notification)
  })
  peer.on('request', (request, answer) => {
    request.peerName = peer.name
    socket.emit('request', request, answer)
  })
  peer.on('newconsumer', handleConsumer)
  peer.consumers.forEach(handleConsumer)
}

const handleConsumer = consumer => {
  console.log('Receiving consumer')
  const stream = new MediaStream()
  consumer.receive(transport).then(stream.addTrack)
}

const startMic = () => {
  const transport = room.createTransport('send')
  navigator.getUserMedia({ audio: true, video: false }).then(stream => {
    const track = stream.getAudioTracks()[0]
    room.createProducer(track).send(transport)
  })
}

global.joinRoom = () => {
  const username = document.getElementById('username').value
  console.log(`Joining room as ${username}!`)
  room.join(username)
    .then(peers => {
      console.log('Successfully joined room!')
      //receiveTransport = room.createTransport('recv')
      for (const peer of peers) {
        handlePeer(peer);
      }
    });
}


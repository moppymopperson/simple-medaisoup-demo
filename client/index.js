'use strict'

const io = require('socket.io-client')
const mediasoupClient = require('mediasoup-client')
const room = new mediasoupClient.Room()
const socket = io('http://localhost:3000')
let receiveTransport

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
  console.log('RECEIVED NOTIFICATION!!')
  room.receiveNotification(notification)
})

room.on('request', (request, success) => {
  console.log('Request: ' + request.method)
  const username = document.getElementById('username').value
  request.peerName = username
  socket.emit('request', request, success)
})

room.on('notify', notification => {
  console.log('Room sending notification', notification)
  const username = document.getElementById('username').value
  notification.peerName = username
  socket.emit('notify', notification)
})
room.on('newpeer', peer => {
  console.log('New peer joined room: ' + peer.peerName)
  handlePeer(peer)
})

const handlePeer = peer => {
  console.log(`handling peer: ${peer.name}`)
  peer.on('newconsumer', handleConsumer)
  peer.consumers.forEach(handleConsumer)
}

const handleConsumer = consumer => {
  console.log('    handling consumer')
  consumer.receive(receiveTransport).then(track => {
    const stream = new MediaStream()
    stream.addTrack(track)

    const AudioContext = window.AudioContext || window.webkitAudioContext
    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    const processor = context.createScriptProcessor(1024, 1, 1)
    console.log('MediaStream', stream)

    let count = 0
    source.connect(processor)
    processor.connect(context.destination)
    processor.onaudioprocess = event => {
      if (count % 100 === 0) {
        const raw = event.inputBuffer.getChannelData(0)
        console.log(raw)
      }
      count += 1
    }

    const audio = document.querySelector('audio')
    audio.srcObject = stream
  })
}

const startMic = () => {
  console.log('Starting mic...')
  const transport = room.createTransport('send')
  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: false
    })
    .then(stream => {
      const track = stream.getAudioTracks()[0]
      console.log('Using audio device: ' + track.label)
      room.createProducer(track).send(transport)
      console.log('Testing')
    })
}

global.joinRoom = () => {
  const username = document.getElementById('username').value
  console.log(`Joining room as ${username}!`)
  room.join(username, { socketId: socket.id }).then(peers => {
    console.log('Joined!')
    receiveTransport = room.createTransport('recv')
    peers.forEach(handlePeer)
    startMic()
  })
}

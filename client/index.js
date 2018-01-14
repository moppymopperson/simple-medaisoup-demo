'use strict'

const io = require('socket.io-client')
const mediasoupClient = require('mediasoup-client')

const socket = io('http://localhost:3000')
const mediaStream = new MediaStream()
let receiveTransport
let sendTransport

socket.on('connect', () => {
  console.log('Connected!')
})

socket.on('error', () => {
  console.log(error)
})

const createRoom = () => {
  const options = {
    requestTimeout: 10000,
    transportOptions: {
      tcp: false
    }
  }

  const room = new mediasoupClient.Room(options)

  room.on('newpeer', handleNewPeer)
  room.on('notify', handleNotify)
  room.on('request', dispatchRequest)
  room.on('error', handleRoomError)
  return room
}

const joinRoom = () => {
  const room = createRoom()
  const username = documnet.queryElementById('username').value
  console.log(`Joining room as ${username}!`)
  room.join(username).then(peers => {
    console.log('Creating send and receive transports!')
    receiveTransport = room.createTransport('recv')
    sendTransport = room.createTransport('send')
    startMicrophone(room)
    peers.forEach(handleNewPeer)
  })
}

const joinButton = document.getElementById('join')
joinButton.onClick = joinRoom

const handleNewPeer = peer => {
  console.log(`Peer ${peer.name} joined the room!`)
  peer.consumers.forEach(handleConsumer)
  peer.on('newconsumer', handleConsumer)
}

const handleConsumer = consumer => {
  console.log(`Adding new consumer for peer ${consumer.peer.name}!`)
  consumer.receive(receiveTransport).then(track => {
    console.log('Track enabled!')
    mediaStream.addTrack(track)

    const context = new AudioContext()
    const source = context.createMediaStreamSource(mediaStream)
    const processor = context.createScriptProcessor(1024, 1, 1)

    let count = 0
    source.connect(processor)
    processor.onaudioprocess = event => {
      console.log('event!')
      //   if (count % 100 === 0) {
      //     const data = event.inputBuffer.getChannelData(0)
      //     console.log(data)
      //   }
      //   count += 1
    }
  })
}

const handleNotify = notification => {
  console.log('handleNotify')
  fatal('Not implemented')
}

const handleRoomError = error => {
  console.log('Room Error!', error)
}

const startMicrophone = room => {
  console.log('Starting microphone...')
  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then(stream => {
      const audio = stream.getAudioTracks()[0]
      const producer = room.createProducer(audio)
      producer.send(sendTransport)
    })
    .then(() => {
      console.log('Sending audio!')
    })
    .catch(handleRoomError)
}

const dispatchRequest = (request, accept, reject) => {
  socket.on('message', message => {
    console.log(`Received response to ${request.method} request`)
    if (message.type === 'mediasoup-response') {
      const response = message.body
      accept(response)
      console.log('Accepted response from server!')
    } else {
      console.warn('Unknown message type!')
    }
  })

  console.log(`Dispatching ${request.method} request`)
  socket.send({ type: 'mediasoup-request', body: request })
}

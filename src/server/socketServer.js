const socket = require('socket.io')
const Crypto = require('crypto')
const fs = require('fs')
const colour = require('colour')
const { execSync } = require('child_process')
const e = require('express')

function initSocketServer (server) {
  colour.setTheme({
    startup: 'rainbow',
    running: 'blue',
    error: 'red'
  })

  const io = socket(server)

  io.on('connection', (socket) => {
    console.log('A user just connected.')

    socket.on('disconnect', () => {
      console.log('A user has disconnected.')
    })
    const uid = Crypto.randomBytes(32).toString('hex')
    const ip = socket.request.connection.remoteAddress
    console.log(ip)

    socket.on('newPlayer', (username) => {
      console.log(username)
      const credentials = { username: username, uid: uid, ip: ip }
      console.log(credentials)
      io.to(socket.id).emit('newPlayer', credentials)
    })

    socket.on('pastPlayer', (credentials) => {
      const newCredentials = { username: credentials.username, uid: credentials.uid, ip: ip }
      console.log(credentials)
      io.to(socket.id).emit('pastPlayer', newCredentials)
      // io.emit('pastPlayer')
    })

    socket.on('createLobby', () => {
      const gameId = Crypto.randomBytes(4).toString('hex').toUpperCase()
      const socketId = socket.id
      console.log(gameId)
      console.log(socketId)
      socket.join(gameId)
      console.log(io.sockets.adapter.rooms)
      io.to(gameId).emit('lobbyJoined', { gameId: gameId, socketId: socketId })
      // io.emit('createLobby', {gameId: gameId, socketId: socketId})
    })

    socket.on('joinLobby', (data) => {
      console.log(data)
      const lookUp = io.sockets.adapter.rooms.get(data.gameId)
      console.log(data.gameId)
      console.log(lookUp)
      if (lookUp === undefined) {
        io.to(socket.id).emit('noLobby', data.gameId)
      } else {
        if (lookUp.size == 2) {
          io.to(socket.id).emit('fullLobby', data.gameId)
        } else {
          const socketId = socket.id
          console.log(data.gameId)
          socket.join(data.gameId)
          console.log(io.sockets.adapter.rooms)
          console.log(lookUp.size)
          const arr = Array.from(lookUp)
          console.log(arr[0])
          console.log(arr[1])
          io.in(data.gameId).emit('playerJoined', data)
          io.to(arr[0]).emit('host', data)
        }
      }
    })

    socket.on('p2', (data) => {
      const lookUp = io.sockets.adapter.rooms.get(data.gameId)
      const arr = Array.from(lookUp)
      io.to(arr[1]).emit('p2', data)
    })

    socket.on('beginLoad', (data) => {
      const lookUp = io.sockets.adapter.rooms.get(data.gameId)
      const arr = Array.from(lookUp)
      io.to(arr[0]).emit('startGame', data)
    })

    socket.on('startGame', (data) => {
      const lookUp = io.sockets.adapter.rooms.get(data.gameId)
      const arr = Array.from(lookUp)
      console.log(data.gameId)
      io.to(arr[0]).emit('loadBoard', data)
    })

    socket.on('loadPieces', (data) => {
      const pieceArr = ['1A', '2A', '3A', '4A', '5A', '6A', '7A', '8A', '1B', '2B', '1C', '2C', '1D', '2D', '3D', '4D', '1E', '2E', '3E', '4E', '5E',
        '6E', '7E', '8E', '9E', '10E', '11E', '12E', '1F', '2F', '1G', '2G', '3G', '1H', '2H', '1I', '2I', '3I', '4I', '5I', '6I', '7I', '8I', '9I', '1J',
        '1K', '1L', '2L', '3L', '4L', '1M', '2M', '1N', '2N', '3N', '4N', '5N', '6N', '1O', '2O', '3O', '4O', '5O', '6O', '7O', '8O', '9P', '10P', '1Q',
        '1R', '2R', '3R', '4R', '5R', '6R', '1S', '2S', '3S', '4S', '1T', '2T', '3T', '4T', '5T', '6T', '1U', '2U', '3U', '4U', '1V', '2V', '1W', '2W',
        '1X', '1Y', '2Y', '1Z', '1_', '2_']

      // https://medium.com/@nitinpatel_20236/how-to-shuffle-correctly-shuffle-an-array-in-javascript-15ea3f84bfb
      for (let i = pieceArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * i)
        const tempval = pieceArr[i]
        pieceArr[i] = pieceArr[j]
        pieceArr[j] = tempval
      }
      const lookUp = io.sockets.adapter.rooms.get(data.gameId)
      const arr = Array.from(lookUp)
      console.log('test')
      io.to(arr[0]).emit('p1Pieces', { gameId: data.gameId, pieceArr: pieceArr })
    })

    socket.on('p1PiecesDone', (data) => {
      console.log(data)
      console.log(data.pieceArr)
      console.log(data.pieceArr.length)
      const lookUp = io.sockets.adapter.rooms.get(data.gameId)
      const arr = Array.from(lookUp)
      io.to(arr[1]).emit('loadBoard2', data)
    })

    socket.on('loadPieces2', (data) => {
      const lookUp = io.sockets.adapter.rooms.get(data.gameId)
      const arr = Array.from(lookUp)
      io.to(arr[1]).emit('p2Pieces', data)
    })

    socket.on('p2PiecesDone', (data) => {
      console.log(data.pieceArr.length)
      pieceArr = data.pieceArr
      console.log(pieceArr)
      io.to(data.gameId).emit('waitOnFinish', data)
    })

    let allDropped = []
    // socket.on('itemDropped', (data) => {
    //     console.log(data.gameId)
    //     console.log(data.droppedItems)
    //     io.to(data.gameId).emit('drop', { gameId: data.gameId, droppedItems: data.droppedItems, allDropped: allDropped, count: data.count })
    // })

    socket.on('saveDropped', (data) => {
      for (let i = 0; i < data.droppedItems.length; i++) {
        console.log(data.droppedItems[i])
        console.log(allDropped[i])
        allDropped.push(data.droppedItems[i])
      }
      const map = {}
      const tempArr = []
      allDropped.forEach(element => {
        if (!map[JSON.stringify(element)]) {
          map[JSON.stringify(element)] = true
          tempArr.push(element)
        }
      })
      allDropped = tempArr
      console.log(allDropped)
      io.to(socket.id).emit('dropSaved', { allDropped: allDropped, droppedItems: data.droppedItems, gameId: data.gameId })
    })

    socket.on('addPiece', (element) => {
      console.log('addPiece')
      console.log(element)
      const random = getRandomPiece(0, pieceArr.length, pieceArr)
      console.log(pieceArr.length)
      if (pieceArr.length > 0) {
        io.to(socket.id).emit('addPiece', { element: element, piece: random[0] })
      } else {
        console.log('No remaining tiles')
      }
    })
    const dictionary = fs.readFileSync('./dictionary.txt', 'utf-8')
    const dictionaryArr = dictionary.split('\r\n')
    socket.on('checkDropped', (data) => {
      console.log(dictionaryArr.length)
      io.to(socket.id).emit('checkDropped', { gameId: data.gameId, droppedItems: data.droppedItems, allDropped: allDropped, dictionaryArr: dictionaryArr })
    })

    let exists = []
    let previousWords = []
    socket.on('dictionarySearch', (data) => {

      for (let i = 0; i < previousWords.length; i++) {
        removeElement(data.allWords, previousWords[i])
      }

      for (let i = 0; i < data.allWords.length; i++) {
        exists.push({ word: data.allWords[i], exists: (binarySearch(dictionaryArr, data.allWords[i])) })
      }
      console.log('check if all equal')
      console.log(exists)
      const allEqual = boolCheck(exists)
      console.log(allEqual)

      if (allEqual === true) {
          for (let i = 0; i < data.allWords.length; i++) {
            previousWords.push(data.allWords[i])
          }
      } else {
          console.log('not all words exist')
      }

      removeDuplicates(previousWords)
      console.log(previousWords)
      console.log('previous')
      console.log(previousWords)
      console.log(data.allWords)
      io.to(socket.id).emit('searchComplete', { allEqual: allEqual, gameId: data.gameId, droppedItems: data.droppedItems, previousWords: previousWords })
      exists = []
    })

    // socket.on('getPrevious', () => {
    //   io.to(socket.id).emit('getPrevious', previousWords)
    // })

    socket.on('piecesRemoved', (data) => {
      console.log(data.gameId)
      console.log('gameId above')
      io.to(data.gameId).emit('placePieces', data)
    })
  })
}

function getRandomPiece (min, max, arr) {
  const ranNum = Math.floor(Math.random() * (max - min) + min)
  const piece = arr[ranNum]
  removeElement(arr, piece)
  const ret = [piece, arr]
  return ret
}

function removeElement (arr, elem) {
  const index = arr.indexOf(elem)
  if (index > -1) {
    arr.splice(index, 1)
  }
}

function removeDuplicates (arr) {
  const x = {}
  arr.forEach(function (i) {
    if (!x[i]) {
      x[i] = true
    }
  })
  return Object.keys(x)
};

function binarySearch (dictionaryArr, word) {
  let start = 0
  let end = dictionaryArr.length - 1
  while (start <= end) {
    const middle = Math.floor((start + end) / 2)
    if (dictionaryArr[middle] === word) {
      return true
    } else if (dictionaryArr[middle] < word) {
      start = middle + 1
    } else {
      end = middle - 1
    }
  }
  return false
}

module.exports = {
  initSocketServer: initSocketServer
}

function boolCheck (arr) {
  let bool = true
  let i = 0
  while (i < arr.length || bool === false) {
    if (arr[i].exists === true){
      bool = true
      i += 1
    } else {
      bool = false
    }
  }
  return bool
}
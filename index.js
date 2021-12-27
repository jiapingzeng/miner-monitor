// web
const express = require('express')
const app = express()

// socket
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

// os
const { spawn } = require('child_process')
const path = require('path')
const os = require('os')
const Convert = require('ansi-to-html')
const convert = new Convert({
    newline: true
})

// var
const port = 3003

// *****

const paths = {
    'avn': path.join('C:/mining/cpuminer-opt-win/miner-avian-minotaurx.bat'),
    'eth': path.join('C:/mining/t-rex-0.24.8-win/start.bat'),
    'rtm': path.join('C:/mining/xmrig-6.16.0/start.cmd')
}

const coins = []
const miners = []
console.log(`mining ${coins.join(', ')}`)

for (coin of process.argv.slice(2)) {
    if (paths[coin]) {
        miners.push({
            'coin': coin.toUpperCase(),
            'process': spawn(paths[coin])
        })
        coins.push(coin.toUpperCase())
    }
    else console.log(`no path specified for ${coin}, skipping`)
}

// *****


app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

io.on('connection', (socket) => {
    console.log('client connected')

    socket.emit('coins', coins)
})

for (let miner of miners) {
    miner.process.stdout.on('data', (data) => {
        let msg = Buffer.from(data).toString()
        console.log('stdout', msg)
        io.sockets.emit('stdout', { coin: miner.coin, msg: convert.toHtml(msg) })
    })
    miner.process.stderr.on('data', (data) => {
        let msg = Buffer.from(data).toString()
        console.error('stderr', msg)
        io.sockets.emit('stderr', { coin: miner.coin, msg: convert.toHtml(msg) })
    })
    miner.process.on('exit', (data) => {
        let code = Buffer.from(data).toString()
        let msg = `miner exited with code ${code}`
        console.log(msg)
        io.sockets.emit('exited', { coin: miner.coin, msg: convert.toHtml(msg) })
    })
}

server.listen(port, () => {
    const ni = os.networkInterfaces()
    const dev = Object.keys(ni)[0]
    const ip = ni[dev][1].address
    console.log(`listening on http://${ip}:${port}`)
})



const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
const port = parseInt(process.env.PORT || '3000', 10)

app.prepare().then(() => {
  if (!dev) {
    const secret = process.env.NEXTAUTH_SECRET || ''
    if (secret.length < 32 || secret.includes('change-in-production')) {
      console.error(
        '[kensetsu-dx] 本番起動には NEXTAUTH_SECRET（32文字以上のランダム文字列）が必要です。.env.local を確認してください。',
      )
      process.exit(1)
    }
  }
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    path: '/ws',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  })

  const userSockets = new Map()

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId
    if (!userId) { socket.disconnect(); return }

    if (!userSockets.has(userId)) userSockets.set(userId, new Set())
    userSockets.get(userId).add(socket.id)

    socket.on('join-conversation', (conversationId) => {
      socket.join(`conv:${conversationId}`)
    })

    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`)
    })

    socket.on('send-message', (data) => {
      io.to(`conv:${data.conversationId}`).emit('new-message', data.message)
      if (data.participantIds) {
        data.participantIds.forEach((uid) => {
          if (uid !== userId && userSockets.has(uid)) {
            userSockets.get(uid).forEach((sid) => {
              io.to(sid).emit('unread-update', {
                conversationId: data.conversationId,
                message: data.message,
              })
            })
          }
        })
      }
    })

    socket.on('mark-read', (data) => {
      io.to(`conv:${data.conversationId}`).emit('read-update', {
        conversationId: data.conversationId,
        userId,
        lastReadAt: data.lastReadAt,
      })
    })

    socket.on('disconnect', () => {
      if (userSockets.has(userId)) {
        userSockets.get(userId).delete(socket.id)
        if (userSockets.get(userId).size === 0) userSockets.delete(userId)
      }
    })
  })

  global.io = io
  global.userSockets = userSockets

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
  })
})

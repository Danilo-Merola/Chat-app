import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'
import roomsRouter from './routes/rooms'
import { setupWebSocket } from './ws/handler'

const app = express()
const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({ origin: FRONTEND_URL }))
app.use(express.json())

app.use('/api/rooms', roomsRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

const server = http.createServer(app)

const wss = new WebSocketServer({ server, path: '/ws' })
setupWebSocket(wss)

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
  console.log(`🔌 WebSocket disponível em ws://localhost:${PORT}/ws`)
})

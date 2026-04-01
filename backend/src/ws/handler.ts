import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { v4 as uuidv4 } from 'uuid'
import { dbService } from '../db'
import { streamClaudeResponse } from '../services/claude'

interface Client {
  ws: WebSocket
  username: string
  roomId: string
}

interface WSMessage {
  type: 'join' | 'message' | 'typing'
  roomId?: string
  username?: string
  content?: string
}

interface ServerMessage {
  type: 'joined' | 'message' | 'ai_start' | 'ai_token' | 'ai_done' | 'user_list' | 'error' | 'typing'
  payload: unknown
}

const clients = new Map<WebSocket, Client>()

function broadcast(roomId: string, data: ServerMessage, exclude?: WebSocket) {
  const msg = JSON.stringify(data)
  clients.forEach((client, ws) => {
    if (client.roomId === roomId && ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(msg)
    }
  })
}

function getRoomUsers(roomId: string): string[] {
  const users: string[] = []
  clients.forEach((client) => {
    if (client.roomId === roomId) users.push(client.username)
  })
  return users
}

function sendTo(ws: WebSocket, data: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log(`Nova conexão WS de ${req.socket.remoteAddress}`)

    ws.on('message', async (raw) => {
      let msg: WSMessage
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        sendTo(ws, { type: 'error', payload: 'Mensagem inválida' })
        return
      }

      // JOIN ROOM
      if (msg.type === 'join') {
        const { roomId, username } = msg
        if (!roomId || !username) {
          sendTo(ws, { type: 'error', payload: 'roomId e username são obrigatórios' })
          return
        }

        clients.set(ws, { ws, username, roomId })

        const history = await dbService.getMessages(roomId)

        sendTo(ws, {
          type: 'joined',
          payload: { history, users: getRoomUsers(roomId) },
        })

        broadcast(
          roomId,
          {
            type: 'user_list',
            payload: getRoomUsers(roomId),
          },
          ws
        )

        broadcast(roomId, {
          type: 'message',
          payload: {
            id: uuidv4(),
            author: 'Sistema',
            content: `${username} entrou na sala`,
            is_ai: false,
            created_at: Date.now(),
            system: true,
          },
        })
        return
      }

      // TYPING
      if (msg.type === 'typing') {
        const client = clients.get(ws)
        if (!client) return
        broadcast(client.roomId, { type: 'typing', payload: { username: client.username } }, ws)
        return
      }

      // MESSAGE
      if (msg.type === 'message') {
        const client = clients.get(ws)
        if (!client || !msg.content?.trim()) return

        const { roomId, username } = client
        const content = msg.content.trim()

        const saved = await dbService.saveMessage({
          id: uuidv4(),
          room_id: roomId,
          author: username,
          content,
          is_ai: false,
        })

        const messagePayload = {
          id: saved.id,
          author: saved.author,
          content: saved.content,
          is_ai: false,
          created_at: saved.created_at,
        }

        // Envia para todos incluindo o remetente
        sendTo(ws, { type: 'message', payload: messagePayload })
        broadcast(roomId, { type: 'message', payload: messagePayload }, ws)

        // Verifica se é comando de IA: /ai <pergunta>
        if (content.toLowerCase().startsWith('/ai ')) {
          const aiQuery = content.slice(4).trim()
          if (!aiQuery) return

          const aiMsgId = uuidv4()

          // Avisa que a IA começou a responder
          const aiStart = {
            id: aiMsgId,
            author: 'Claude AI',
            content: '',
            is_ai: true,
            created_at: Date.now(),
          }
          broadcast(roomId, { type: 'ai_start', payload: aiStart })
          sendTo(ws, { type: 'ai_start', payload: aiStart })

          const history = await dbService.getMessages(roomId, 20)

          try {
            await streamClaudeResponse(
              aiQuery,
              history,
              (token) => {
                const tokenMsg = { id: aiMsgId, token }
                broadcast(roomId, { type: 'ai_token', payload: tokenMsg })
                sendTo(ws, { type: 'ai_token', payload: tokenMsg })
              },
              (fullText) => {
                dbService.saveMessage({
                  id: aiMsgId,
                  room_id: roomId,
                  author: 'Claude AI',
                  content: fullText,
                  is_ai: true,
                })
                broadcast(roomId, { type: 'ai_done', payload: { id: aiMsgId } })
                sendTo(ws, { type: 'ai_done', payload: { id: aiMsgId } })
              }
            )
          } catch (err) {
            console.error('Erro ao chamar Claude:', err)
            broadcast(roomId, {
              type: 'error',
              payload: 'Erro ao contatar a IA. Verifique a API key.',
            })
          }
        }
      }
    })

    ws.on('close', () => {
      const client = clients.get(ws)
      if (client) {
        const { roomId, username } = client
        clients.delete(ws)

        broadcast(roomId, {
          type: 'message',
          payload: {
            id: uuidv4(),
            author: 'Sistema',
            content: `${username} saiu da sala`,
            is_ai: false,
            created_at: Date.now(),
            system: true,
          },
        })

        broadcast(roomId, {
          type: 'user_list',
          payload: getRoomUsers(roomId),
        })
      }
    })

    ws.on('error', (err) => console.error('WS error:', err))
  })
}

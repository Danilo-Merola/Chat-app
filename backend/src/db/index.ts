import { createClient } from '@libsql/client'
import path from 'path'

const db = createClient({
  url: 'file:' + path.join(process.cwd(), 'chat.db'),
})

export interface Room {
  id: string
  name: string
  created_at: number
}

export interface Message {
  id: string
  room_id: string
  author: string
  content: string
  is_ai: boolean
  created_at: number
}

async function init() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      is_ai INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );
  `)
}

init().catch(console.error)

export const dbService = {
  async getRooms(): Promise<Room[]> {
    const r = await db.execute('SELECT * FROM rooms ORDER BY created_at DESC')
    return r.rows as unknown as Room[]
  },

  async getRoomByName(name: string): Promise<Room | undefined> {
    const r = await db.execute({ sql: 'SELECT * FROM rooms WHERE name = ?', args: [name] })
    return r.rows[0] as unknown as Room | undefined
  },

  async createRoom(id: string, name: string): Promise<Room> {
    await db.execute({ sql: 'INSERT INTO rooms (id, name) VALUES (?, ?)', args: [id, name] })
    const r = await db.execute({ sql: 'SELECT * FROM rooms WHERE id = ?', args: [id] })
    return r.rows[0] as unknown as Room
  },

  async getMessages(roomId: string, limit = 50): Promise<Message[]> {
    const r = await db.execute({
      sql: 'SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC LIMIT ?',
      args: [roomId, limit],
    })
    return r.rows.map((row) => ({ ...row, is_ai: row.is_ai === 1 })) as unknown as Message[]
  },

  async saveMessage(msg: Omit<Message, 'created_at'>): Promise<Message> {
    await db.execute({
      sql: 'INSERT INTO messages (id, room_id, author, content, is_ai) VALUES (?, ?, ?, ?, ?)',
      args: [msg.id, msg.room_id, msg.author, msg.content, msg.is_ai ? 1 : 0],
    })
    const r = await db.execute({ sql: 'SELECT * FROM messages WHERE id = ?', args: [msg.id] })
    return { ...r.rows[0], is_ai: r.rows[0].is_ai === 1 } as unknown as Message
  },

  async updateMessage(id: string, content: string): Promise<void> {
    await db.execute({ sql: 'UPDATE messages SET content = ? WHERE id = ?', args: [content, id] })
  },
}

export default db

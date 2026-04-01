import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { dbService } from '../db'

const router = Router()

// GET /api/rooms - lista todas as salas
router.get('/', async (_req: Request, res: Response) => {
  const rooms = await dbService.getRooms()
  res.json(rooms)
})

// POST /api/rooms - cria ou retorna sala existente
router.post('/', async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string }

  if (!name || name.trim().length < 2) {
    res.status(400).json({ error: 'Nome da sala deve ter pelo menos 2 caracteres' })
    return
  }

  const trimmed = name.trim().toLowerCase().replace(/\s+/g, '-')

  const existing = await dbService.getRoomByName(trimmed)
  if (existing) {
    res.json(existing)
    return
  }

  const room = await dbService.createRoom(uuidv4(), trimmed)
  res.status(201).json(room)
})

// GET /api/rooms/:id/messages
router.get('/:id/messages', async (req: Request, res: Response) => {
  const messages = await dbService.getMessages(req.params.id)
  res.json(messages)
})

export default router

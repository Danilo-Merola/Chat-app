import Anthropic from '@anthropic-ai/sdk'
import { Message } from '../db'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Você é um assistente de IA integrado a um chat em tempo real.
Seja útil, conciso e amigável. Responda sempre em português, a menos que o usuário escreva em outro idioma.
Você pode ver o histórico da conversa e deve responder de forma contextualizada.`

export async function streamClaudeResponse(
  userMessage: string,
  history: Message[],
  onToken: (token: string) => void,
  onDone: (fullText: string) => void
): Promise<void> {
  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-10).map((m) => ({
      role: m.is_ai ? ('assistant' as const) : ('user' as const),
      content: `${m.is_ai ? '' : `[${m.author}]: `}${m.content}`,
    })),
    {
      role: 'user' as const,
      content: userMessage,
    },
  ]

  let fullText = ''

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  })

  stream.on('text', (text) => {
    fullText += text
    onToken(text)
  })

  await stream.finalMessage()
  onDone(fullText)
}

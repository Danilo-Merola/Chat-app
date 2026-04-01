# 💬 Chat em Tempo Real com IA

Aplicação de chat em tempo real com múltiplas salas e assistente de IA integrado via **Claude (Anthropic)**. Construído com React, TypeScript, WebSocket e Node.js.

![Stack](https://img.shields.io/badge/TypeScript-5.4-blue?style=flat-square&logo=typescript)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=flat-square&logo=node.js)
![WebSocket](https://img.shields.io/badge/WebSocket-ws-orange?style=flat-square)

## ✨ Funcionalidades

- **Chat em tempo real** via WebSocket — mensagens instantâneas entre usuários
- **Múltiplas salas** — crie ou entre em qualquer sala pelo nome
- **Assistente IA** — use `/ai <pergunta>` para invocar o Claude com streaming de tokens
- **Indicador de digitação** — veja quando alguém está digitando
- **Histórico persistente** — mensagens salvas em SQLite e carregadas ao entrar na sala
- **Interface escura e moderna** — UI responsiva com avatares, bolhas e scroll automático

## 🖥️ Preview

```
[Lobby] → Digite seu nome + nome da sala → [Chat]

Usuário: oi pessoal!
Sistema: João entrou na sala
João:    /ai como funciona WebSocket?
Claude▌: WebSocket é um protocolo de comunicação bidirecional...
         (streaming em tempo real)
```

## 🏗️ Arquitetura

```
frontend/          (React + TypeScript + Vite — porta 5173)
├── src/
│   ├── components/ChatRoom.tsx   # UI principal do chat
│   ├── hooks/useWebSocket.ts     # Hook de conexão WS
│   ├── pages/Lobby.tsx           # Tela de entrada
│   ├── types/index.ts            # Tipos compartilhados
│   └── App.tsx

backend/           (Node.js + TypeScript + Express — porta 3001)
├── src/
│   ├── ws/handler.ts             # Servidor WebSocket + lógica de salas
│   ├── services/claude.ts        # Integração com Claude API (streaming)
│   ├── routes/rooms.ts           # REST API de salas
│   ├── db/index.ts               # SQLite via better-sqlite3
│   └── index.ts
```

**Fluxo de uma mensagem com IA:**
1. Usuário digita `/ai pergunta`
2. WebSocket emite para o servidor
3. Servidor salva a mensagem e faz broadcast para a sala
4. Servidor chama a Claude API com streaming
5. Tokens chegam em tempo real no chat de todos os usuários

## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js 20+
- Chave de API da Anthropic → [console.anthropic.com](https://console.anthropic.com)

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/chat-app.git
cd chat-app
```

### 2. Configure o backend
```bash
cd backend
npm install
cp .env.example .env
# Edite o .env e coloque sua ANTHROPIC_API_KEY
npm run dev
```

### 3. Configure o frontend (outro terminal)
```bash
cd frontend
npm install
npm run dev
```

### 4. Acesse
Abra [http://localhost:5173](http://localhost:5173) no navegador.

## 🔌 API WebSocket

| Evento enviado   | Payload                          | Descrição                     |
|------------------|----------------------------------|-------------------------------|
| `join`           | `{ roomId, username }`           | Entrar em uma sala            |
| `message`        | `{ content }`                    | Enviar mensagem               |
| `typing`         | —                                | Notificar que está digitando  |

| Evento recebido  | Payload                          | Descrição                     |
|------------------|----------------------------------|-------------------------------|
| `joined`         | `{ history, users }`             | Confirmação de entrada        |
| `message`        | `Message`                        | Nova mensagem na sala         |
| `ai_start`       | `{ id, author, ... }`            | IA começou a responder        |
| `ai_token`       | `{ id, token }`                  | Token de streaming da IA      |
| `ai_done`        | `{ id }`                         | IA terminou de responder      |
| `user_list`      | `string[]`                       | Lista atualizada de usuários  |
| `typing`         | `{ username }`                   | Usuário está digitando        |

## 🛠️ Tecnologias

| Camada     | Tecnologia                              |
|------------|-----------------------------------------|
| Frontend   | React 18, TypeScript, Vite              |
| Backend    | Node.js, Express, TypeScript            |
| WebSocket  | `ws` (servidor), WebSocket API (cliente)|
| IA         | Anthropic SDK (`claude-sonnet-4`)       |
| Banco      | SQLite via `better-sqlite3`             |

## 📁 Variáveis de ambiente

```env
ANTHROPIC_API_KEY=sua_chave_aqui   # Obrigatório
PORT=3001                           # Porta do servidor (padrão: 3001)
FRONTEND_URL=http://localhost:5173  # URL do frontend para CORS
```

## 🤝 Contribuindo

Pull requests são bem-vindos! Para mudanças maiores, abra uma issue primeiro.

---

Feito com ☕ e TypeScript

<div align="center">

# Syncpad

### Real-Time Collaborative Code Editor

Edit code together, live. Multiple users, one document, instant sync — with shared cursors, presence, and in-browser code execution.

[**Live Demo**](https://sync-pad-ten.vercel.app) · [Report Bug](https://github.com/sanyaa404/syncPad/issues) · [Request Feature](https://github.com/sanyaa404/syncPad/issues)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

</div>

---

## Overview

Syncpad is a full-stack collaborative code editor inspired by tools like Google Docs and CodeSandbox, built for real-time multi-user coding. When one person types, everyone in the room sees the change instantly — along with each collaborator's live cursor, name, and typing status. Code can be run directly in the browser across five languages.

The project demonstrates real-time systems, event-driven communication, full-stack architecture, and production deployment.

## Features

- **Real-time collaborative editing** — simultaneous multi-user editing with sub-100ms sync via WebSockets
- **Live cursors & presence** — see each collaborator's cursor position, name, and color in real time
- **Typing indicators** — know when someone else is actively editing
- **Room-based sessions** — create a room, share a 6-character code, and collaborate instantly
- **Code execution** — run code in 5 languages (JavaScript, Python, C++, Java, TypeScript) via a sandboxed environment
- **Authentication** — secure JWT-based auth with hashed passwords
- **Persistent sessions** — code is saved automatically and restored when you reopen a room
- **Monaco Editor** — the same editor that powers VS Code, with syntax highlighting for every supported language

## Tech Stack

**Frontend**
- React 18 (Vite)
- Monaco Editor
- Socket.IO Client
- Tailwind CSS
- Axios

**Backend**
- Node.js + Express
- Socket.IO
- MongoDB + Mongoose
- JSON Web Tokens (JWT)
- bcrypt.js

**External Services**
- Judge0 — sandboxed code execution API

**Deployment**
- Frontend — Vercel
- Backend + Database — Railway

## Architecture

Syncpad runs two parallel communication channels on one backend: a stateless REST API for authentication and room management, and a stateful WebSocket layer (Socket.IO) for all real-time collaboration.

```
   Browser A          Browser B          Browser C
      │                   │                   │
      │   WebSocket + HTTP (REST)             │
      └─────────┬─────────┴─────────┬─────────┘
                │                   │
        ┌───────▼───────────────────▼────────┐
        │      Node.js + Express Server      │
        │                                    │
        │   REST API        Socket.IO Server │
        │   /auth           rooms + broadcast│
        │   /rooms          presence tracking│
        │   /execute                         │
        └───────┬────────────────────┬───────┘
                │                    │
          ┌─────▼─────┐        ┌─────▼─────┐
          │  MongoDB  │        │  Judge0   │
          │ users,    │        │ sandboxed │
          │ rooms,    │        │ execution │
          │ code      │        │           │
          └───────────┘        └───────────┘
```

Real-time edits propagate through Socket.IO room broadcasts, using a guard flag to prevent echo loops. Presence data lives in server memory (ephemeral), while rooms and code persist in MongoDB with debounced saves.

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local instance or MongoDB Atlas)
- npm

### Installation

1. Clone the repository

```bash
git clone https://github.com/sanyaa404/syncPad.git
cd syncPad
```

2. Set up the backend

```bash
cd server
npm install
```

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/syncpad
JWT_SECRET=your_secret_key_here
FRONTEND_URL=http://localhost:3000
```

Start the backend:

```bash
npm run dev
```

3. Set up the frontend

```bash
cd ../client
npm install
```

Create a `.env` file in the `client` directory (optional for local dev):

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

4. Open the app

Visit `http://localhost:3000` in your browser. To test real-time collaboration, open a second browser or incognito window, register a second user, and join the same room.

## Usage

1. Register an account or log in.
2. Create a new room and choose a language, or join an existing room with its code.
3. Share the room code with a collaborator.
4. Edit together in real time — you'll see each other's cursors and changes instantly.
5. Click **Run** to execute the code and view the output.

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Log in and receive a JWT |
| `GET`  | `/api/auth/me` | Get the current authenticated user |

### Rooms

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/rooms/create` | Create a new room |
| `POST` | `/api/rooms/join/:roomId` | Join a room by code |
| `GET`  | `/api/rooms/:roomId` | Fetch a room's details |
| `GET`  | `/api/rooms` | List rooms the user belongs to |

### Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/execute` | Run code via Judge0 and return output |

### Socket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join-room` | client → server | `{ roomId, userId, username }` |
| `code-change` | both | `{ roomId, code }` |
| `cursor-move` | both | `{ roomId, line, column }` |
| `typing` | both | `{ roomId, username }` |
| `language-change` | both | `{ roomId, language }` |
| `room-users` | server → client | `[ { socketId, userId, username } ]` |
| `save-code` | client → server | `{ roomId, code }` |

## License

Distributed under the MIT License.


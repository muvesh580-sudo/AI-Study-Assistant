# AI Study Assistant

**Live Demo:** https://ai-study-assistant-nu-six.vercel.app

**Backend API:** https://ai-study-assistant-gfwu.onrender.com

An AI-powered learning platform that helps students understand topics, summarize content, generate quizzes, and create study flashcards.

An AI-powered study companion that helps students understand concepts, summarize notes, generate quizzes, and create flashcards. Built with React, Node.js, Express, MongoDB, and Groq AI.

## Overview

AI Study Assistant is a full-stack web application designed to make studying easier and more interactive. Users can create an account, log in securely, ask AI questions, and revisit their previous conversations.

The application supports multiple learning modes, helping students learn at their own pace through explanations, summaries, quizzes, and flashcards.


## Features

- **AI-Powered Learning:** Ask questions and get AI-generated answers.
- **Explain Mode:** Understand difficult concepts in simple language.
- **Summarize Mode:** Turn study notes into concise summaries.
- **Quiz Mode:** Generate quizzes to practice a topic.
- **Flashcards Mode:** Create flashcards for revision.
- **User Authentication:** Register and log in with secure password hashing and JWT-based authentication.
- **Conversation History:** Save and revisit previous AI conversations.
- **User Data Isolation:** Keep conversation histories separated by authenticated user.
- **Logout:** End the current session and return to the login screen.
- **Markdown Rendering:** Display AI responses with formatted text and tables.
- **Responsive Interface:** Use the application on desktop and mobile screens.


## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- React Markdown
- Remark GFM

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose

### AI Integration
- Groq API

### Authentication and Security
- JSON Web Tokens (JWT)
- bcryptjs
- Environment variables for secrets


## Project Structure

```text
AI-Study-Assistant/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Conversation.js
│   │   └── User.js
│   ├── tests/
│   │   └── api.test.js
│   ├── .env.example
│   ├── .gitignore
│   ├── app.js
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth.jsx
│   │   │   └── MarkdownAnswer.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── test/
│   │   │   ├── App.test.jsx
│   │   │   └── setup.js
│   │   ├── App.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB Atlas account or a local MongoDB instance
- Groq API key

### 1. Clone the repository

```bash
git clone https://github.com/muvesh580-sudo/AI-Study-Assistant.git
cd AI-Study-Assistant
```

### 2. Set up the backend

Copy `backend/.env.example` to `backend/.env` and fill in the values. The server refuses to start if a required value is missing.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | Groq API key |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Long random secret for signing login tokens |
| `PORT` | No | API port, defaults to `5000` |
| `CLIENT_ORIGINS` | In production | Comma-separated frontend URLs allowed to call the API |
| `TRUST_PROXY` | No | Reverse proxies in front of the API, defaults to `1` |
| `DNS_SERVERS` | No | DNS servers for `mongodb+srv` lookups, empty for the system resolver |

Then start the backend:

```bash
cd backend
npm install
npm start
```

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

Set `VITE_API_URL` if the API isn't on `http://localhost:5000`, and add the frontend's URL to `CLIENT_ORIGINS` on the backend.

## API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Service and database status |
| `POST` | `/api/register` | No | Create an account |
| `POST` | `/api/login` | No | Get a login token |
| `POST` | `/api/ask` | Bearer token | Ask the AI and save the conversation |
| `GET` | `/api/conversations` | Bearer token | The caller's 50 most recent conversations |

## Testing

```bash
cd backend
npm test
```

```bash
cd frontend
npm test
npm run lint
```

Backend tests run against a temporary in-memory MongoDB and a fake AI client, so they never touch your real database or Groq quota. The first run downloads a MongoDB binary.

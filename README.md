# AI Study Assistant

**Live Demo:** https://ai-study-assistant-4ga077e1r-uvesh2.vercel.app

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
│   ├── .gitignore
│   ├── package.json
│   └── server.js
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   └── Auth.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
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

```bash
cd backend
npm install
npm start
```

Create a `.env` file inside the `backend/` directory and configure these variables:

```env
GROQ_API_KEY=your_groq_api_key
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_random_secret
```

Start the backend using the start script defined in `backend/package.json`.

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal.

**Note:** Configure the backend API URL and CORS settings appropriately for your environment.
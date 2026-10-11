import authMiddleware from "./middleware/authMiddleware.js";
import jwt from "jsonwebtoken";
import dns from "dns";

dns.setServers(["8.8.8.8","1.1.1.1"]);


import Conversation from "./models/Conversation.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import connectDB from "./config/db.js";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

app.get("/", (req, res) => {
  res.send("AI Study Assistant Backend is running 🚀");
});

app.post("/api/ask", authMiddleware, async (req, res) => {
  try {
    const { question, mode } = req.body;

    if (!question) {
      return res.status(400).json({
        error: "Question is required",
      });
    }

const prompts = {
  explain: `Explain the following topic in simple words.
Use clear examples where helpful.
Break difficult concepts into smaller parts.

Topic:
${question}`,

  summarize: `Summarize the following text clearly.
Keep the important points and remove unnecessary details.
Use bullet points when appropriate.

Text:
${question}`,

  quiz: `Create a short quiz based on the following topic.
Generate 5 multiple-choice questions.
Each question should have 4 options.
Clearly indicate the correct answer after each question.

Topic:
${question}`,

  flashcards: `Create 5 study flashcards based on the following topic.
Format each flashcard as:
Question:
Answer:

Keep the answers concise and useful for revision.

Topic:
${question}`,
};

const selectedPrompt = prompts[mode] || prompts.explain;

const response = await client.chat.completions.create({
  model: "openai/gpt-oss-20b",
  messages: [
    {
      role: "user",
      content: selectedPrompt,
    },
  ],
});

    const answer = response.choices[0].message.content;

    await Conversation.create({
      user: req.user.userId,
      question,
      mode,
      answer,
    });

    res.json({
      question,
      answer,
    });
  } catch (error) {
    console.error("Groq Error:", error);

    res.status(500).json({
      error: "Something went wrong while asking Groq",
    });
  }
});

app.get("/api/conversations", authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      user: req.user.userId,
    }).sort({ createdAt: -1});
    
    res.json(conversations);
  } catch (error) {
    console.error("Failed to fatch conversation:", error.message);

    res.status(500).json({
      error:"Failed to fatch conversations"
    }); 
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        error: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration failed:", error.message);

    res.status(500).json({
      error: "Something went wrong during registration"
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { userId: user._id },
       process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login failed:", error.message);

    res.status(500).json({
      error: "Something went wrong during login",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
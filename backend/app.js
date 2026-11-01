import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import authMiddleware from "./middleware/authMiddleware.js";
import Conversation, { CONVERSATION_MODES } from "./models/Conversation.js";
import User from "./models/User.js";

const AI_MODEL = "openai/gpt-oss-20b";
const MAX_QUESTION_LENGTH = 20000;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72; // bcrypt ignores everything after 72 bytes
const CONVERSATION_LIMIT = 50;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://ai-study-assistant-nu-six.vercel.app",
];

// Compared against when the email is unknown, so both login failures take the same time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("unknown-user-placeholder", 10);

const prompts = {
  explain: (question) => `Explain the following topic in simple words.
Use clear examples where helpful.
Break difficult concepts into smaller parts.

Topic:
${question}`,

  summarize: (question) => `Summarize the following text clearly.
Keep the important points and remove unnecessary details.
Use bullet points when appropriate.

Text:
${question}`,

  quiz: (question) => `Create a short quiz based on the following topic.
Generate 5 multiple-choice questions.
Each question should have 4 options.
Clearly indicate the correct answer after each question.

Topic:
${question}`,

  flashcards: (question) => `Create 5 study flashcards based on the following topic.
Format each flashcard as:
Question:
Answer:

Keep the answers concise and useful for revision.

Topic:
${question}`,
};

const getClientOrigins = () => {
  const configured = process.env.CLIENT_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configured?.length ? configured : DEFAULT_CLIENT_ORIGINS;
};

const limiterOptions = (error) => ({
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error },
});

const createApp = ({ aiClient, limits = {} }) => {
  const app = express();

  app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));

  app.use(helmet());
  app.use(cors({ origin: getClientOrigins() }));
  app.use(express.json());

  const loginLimiter = rateLimit({
    ...limiterOptions("Too many failed login attempts. Please try again later."),
    windowMs: 15 * 60 * 1000,
    limit: limits.login ?? 20,
    skipSuccessfulRequests: true,
  });

  const registerLimiter = rateLimit({
    ...limiterOptions("Too many accounts created. Please try again later."),
    windowMs: 60 * 60 * 1000,
    limit: limits.register ?? 20,
  });

  const askLimiter = rateLimit({
    ...limiterOptions("You are asking too quickly. Please wait a moment."),
    windowMs: 60 * 1000,
    limit: limits.ask ?? 20,
    keyGenerator: (req) => req.user.userId,
  });

  app.get("/", (req, res) => {
    res.send("AI Study Assistant Backend is running 🚀");
  });

  app.get("/api/health", (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;

    res.status(isConnected ? 200 : 503).json({
      status: isConnected ? "ok" : "unavailable",
      database: isConnected ? "connected" : "disconnected",
    });
  });

  app.post("/api/ask", authMiddleware, askLimiter, async (req, res) => {
    try {
      const { question, mode = "explain" } = req.body ?? {};

      if (typeof question !== "string" || !question.trim()) {
        return res.status(400).json({
          error: "Question is required",
        });
      }

      if (question.length > MAX_QUESTION_LENGTH) {
        return res.status(400).json({
          error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer`,
        });
      }

      if (typeof mode !== "string" || !CONVERSATION_MODES.includes(mode)) {
        return res.status(400).json({
          error: "Invalid mode",
        });
      }

      let answer;

      try {
        const response = await aiClient.chat.completions.create({
          model: AI_MODEL,
          messages: [
            {
              role: "user",
              content: prompts[mode](question),
            },
          ],
        });

        answer = response.choices[0]?.message?.content?.trim();
      } catch (error) {
        console.error("Groq request failed:", error.status, error.message);

        if (error.status === 429) {
          return res.status(503).json({
            error: "The AI service is busy. Please try again in a moment.",
          });
        }

        return res.status(502).json({
          error: "The AI service is unavailable. Please try again later.",
        });
      }

      if (!answer) {
        return res.status(502).json({
          error: "The AI returned an empty response. Please try again.",
        });
      }

      const conversation = await Conversation.create({
        user: req.user.userId,
        question,
        mode,
        answer,
      });

      res.json({
        question,
        answer,
        conversation: {
          _id: conversation._id,
          question,
          mode,
          answer,
          createdAt: conversation.createdAt,
        },
      });
    } catch (error) {
      console.error("Failed to save conversation:", error.message);

      res.status(500).json({
        error: "Something went wrong while saving your conversation",
      });
    }
  });

  app.get("/api/conversations", authMiddleware, async (req, res) => {
    try {
      const conversations = await Conversation.find({
        user: req.user.userId,
      })
        .sort({ createdAt: -1 })
        .limit(CONVERSATION_LIMIT)
        .select("question mode answer createdAt")
        .lean();

      res.json(conversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error.message);

      res.status(500).json({
        error: "Failed to fetch conversations",
      });
    }
  });

  app.post("/api/register", registerLimiter, async (req, res) => {
    try {
      const { name, email, password } = req.body ?? {};

      if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        !name.trim() ||
        !email.trim() ||
        !password
      ) {
        return res.status(400).json({
          error: "Name, email and password are required",
        });
      }

      const normalizedName = name.trim();
      const normalizedEmail = email.trim().toLowerCase();

      if (normalizedName.length > MAX_NAME_LENGTH) {
        return res.status(400).json({
          error: `Name must be ${MAX_NAME_LENGTH} characters or fewer`,
        });
      }

      if (
        normalizedEmail.length > MAX_EMAIL_LENGTH ||
        !EMAIL_PATTERN.test(normalizedEmail)
      ) {
        return res.status(400).json({
          error: "Please enter a valid email address",
        });
      }

      if (password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
      }

      if (Buffer.byteLength(password) > MAX_PASSWORD_BYTES) {
        return res.status(400).json({
          error: `Password must be ${MAX_PASSWORD_BYTES} bytes or fewer`,
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name: normalizedName,
        email: normalizedEmail,
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
      // The unique index is the source of truth, so simultaneous sign-ups can't both win.
      if (error.code === 11000) {
        return res.status(409).json({
          error: "User with this email already exists",
        });
      }

      console.error("Registration failed:", error.message);

      res.status(500).json({
        error: "Something went wrong during registration",
      });
    }
  });

  app.post("/api/login", loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body ?? {};

      // Must stay a string check: an object here would reach Mongo as a query operator.
      if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !email.trim() ||
        !password
      ) {
        return res.status(400).json({
          error: "Email and password are required",
        });
      }

      const user = await User.findOne({
        email: email.trim().toLowerCase(),
      }).select("+password");

      const isPasswordCorrect = await bcrypt.compare(
        password,
        user?.password ?? DUMMY_PASSWORD_HASH
      );

      if (!user || !isPasswordCorrect) {
        return res.status(401).json({
          error: "Invalid email or password",
        });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: "7d",
      });

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

  app.use((req, res) => {
    res.status(404).json({
      error: "Route not found",
    });
  });

  // Body-parser messages can quote the request body, so 4xx details are never logged or echoed.
  app.use((error, req, res, next) => {
    const status = error.status ?? 500;

    if (status >= 500) {
      console.error("Unhandled error:", error.message);

      return res.status(500).json({
        error: "Internal server error",
      });
    }

    res.status(status).json({
      error: status === 413 ? "Request is too large" : "Invalid request",
    });
  });

  return app;
};

export default createApp;

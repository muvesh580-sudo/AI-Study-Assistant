import mongoose from "mongoose";

export const CONVERSATION_MODES = ["explain", "summarize", "quiz", "flashcards"];

const conversationSchema = new mongoose.Schema(
  {

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref:"User",
      required: true,
    },

    question: {
      type: String,
      required: true,
    },

    mode: {
      type: String,
      required: true,
      enum: CONVERSATION_MODES,
    },

    answer: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ user: 1, createdAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
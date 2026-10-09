import mongoose from "mongoose";

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

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
const mongoose = require("../db/connection");
const { Schema, model } = mongoose;

const conversationSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  timestamp: { type: Date, default: Date.now, required: true },
  messages: [
    {
      role: { type: String, required: true },
      content: { type: String, required: true },
    },
  ],
});

const Conversation = model("Conversation", conversationSchema);

module.exports = Conversation;

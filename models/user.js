const mongoose = require("../db/connection");
const { Schema, model } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String },
  openai_key: { type: String },
  conversations: [{ type: Schema.Types.ObjectId, ref: "Conversation" }],
});

const User = model("User", userSchema);

module.exports = User;

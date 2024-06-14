const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Conversation = require("../models/conversation");
const bcrypt = require("bcrypt");
const axios = require("axios");

router.get("/hi", (req, res) => {
  console.log("hi");
  res.json({ success: true });
});

router.get("/login", (req, res) => {
  console.log("login page");
  res.json({ message: "login page" });
});

router.post("/login", async (req, res) => {
  // console.log("User logging in:", req.body);

  let userToLogin = await User.findOne({ username: req.body.username });

  console.log("userToLogin: ", userToLogin);

  if (userToLogin) {
    console.log("User logging in:", userToLogin);
    bcrypt.compare(req.body.password, userToLogin.password, (err, result) => {
      if (result) {
        // req.session.userId = userToLogin._id;
        // req.session.username = userToLogin.username;

        res.json({
          user: {
            username: userToLogin.username,
            _id: userToLogin._id,
            displayName: userToLogin.displayName,
          },
          message: "sucesss",
        });
      } else {
        res.status(401).json({ message: "Incorrect Password" });
      }
    });
  } else {
    res.status(401).json({ message: "User not found" });
  }
});

router.get("/signup", (req, res) => {
  res.json({ message: "signup" });
});

router.post("/signup", async (req, res) => {
  console.log(req.body);
  const userObject = req.body;

  if (userObject.username && userObject.password) {
    let plainTextPassword = userObject.password;
    bcrypt.hash(plainTextPassword, 10, async (err, hashedPassword) => {
      userObject.password = hashedPassword;
      const response = await User.create(userObject);

      console.log(response);

      if (!response) {
        res.status(401).json({ message: "User not created" });
      }
      res.json({ message: "User created successfully" });
    });
  } else {
    res.status(401).json({ message: "Username and password required" });
  }
});

router.post("/user-message/:username", async (req, res) => {
  const username = req.params.username;
  const { message, isNewConversation } = req.body;

  const currentUser = await User.findOne({ username: username });
  const openai_key = currentUser.openai_key;

  let conversation;

  if (isNewConversation) {
    // Create a new conversation if the flag is true
    conversation = await Conversation.create({
      user: currentUser._id,
      messages: [{ role: "user", content: message }],
    });

    currentUser.conversations.push(conversation._id);
    await currentUser.save();
  } else {
    // Find the most recent conversation if the flag is not true
    conversation = await Conversation.findOne({ user: currentUser._id }).sort({
      timestamp: -1,
    });

    if (!conversation) {
      return res
        .status(400)
        .json({ message: "No existing conversation found." });
    }

    conversation.messages.push({ role: "user", content: message });
  }

  if (openai_key) {
    try {
      const openaiResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: conversation.messages,
        },
        {
          headers: {
            Authorization: `Bearer ${openai_key}`,
            "Content-Type": "application/json",
          },
        }
      );

      const aiResponseMessage = openaiResponse.data.choices[0].message.content;
      conversation.messages.push({
        role: "assistant",
        content: aiResponseMessage,
      });

      await conversation.save();

      console.log("OpenAI response:", aiResponseMessage);
      res.json({ response: aiResponseMessage });
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      res.status(500).json({ message: "Error calling OpenAI API" });
    }
  } else {
    res.status(401).json({ message: "User's OpenAI key not available" });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logout successful" });
});

module.exports = router;

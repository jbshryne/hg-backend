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

// Helper function to generate a title using OpenAI's API
async function generateTitle(openai_key, message) {
  const promptArray = [
    {
      role: "system",
      content: "You are a conversation title generator for a GPT chat app.",
    },
    {
      role: "user",
      content: `Generate a title for a GPT conversation that begins with the following prompt: '${message}'. Stick to a maximum of 40 characters. Reply with only the title, NOT enclosed in quotation marks.`,
    },
  ];

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: promptArray,
      },
      {
        headers: {
          Authorization: `Bearer ${openai_key}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating title:", error);
    throw new Error("Error generating title from OpenAI");
  }
}

// Helper function to handle new conversation creation
async function handleNewConversation(currentUser, message, openai_key) {
  let newTitle;

  try {
    newTitle = await generateTitle(openai_key, message);
  } catch (error) {
    newTitle = "New Conversation";
  }

  const conversation = await Conversation.create({
    user: currentUser._id,
    messages: [{ role: "user", content: message }],
    title: newTitle,
  });

  currentUser.conversations.push(conversation._id);
  await currentUser.save();

  return conversation;
}

// Helper function to get the most recent conversation
async function getMostRecentConversation(currentUser) {
  return await Conversation.findOne({ user: currentUser._id }).sort({
    timestamp: -1,
  });
}

// Get list of user's conversations
router.get("/conversations/:username", async (req, res) => {
  const username = req.params.username;

  const currentUser = await User
    .findOne
    // { username: username }
    ();

  if (!currentUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const conversations = await Conversation.find({ user: currentUser._id });

  return res.json({ conversations: conversations });
});

// Get one conversation
router.get("/conversation/:conversationId", async (req, res) => {
  const conversationId = req.params.conversationId;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  return res.json({ conversation: conversation });
});

// Delete a conversation
router.delete("/conversation/:conversationId", async (req, res) => {
  const conversationId = req.params.conversationId;
  console.log("conversationId: ", conversationId);

  const conversation = await Conversation.findByIdAndDelete(conversationId);
  console.log("conversation: ", conversation);

  const currentUser = await User.findById(conversation.user);

  currentUser.conversations = currentUser.conversations.filter(
    (conversation) => conversation._id != conversationId
  );

  await currentUser.save();

  if (!conversation) {
    return res.status(404).json({ message: "Conversation not found" });
  }

  return res.json({ message: "Conversation deleted" });
});

// Main route handler
router.post("/user-message/:username", async (req, res) => {
  const username = req.params.username;
  let { message, conversationId } = req.body;

  let conversation;

  try {
    const currentUser = await User.findOne({ username: username });

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { openai_key } = currentUser;
    if (!openai_key) {
      return res
        .status(401)
        .json({ message: "User's OpenAI key not available" });
    }

    if (!conversationId) {
      conversation = await handleNewConversation(
        currentUser,
        message,
        openai_key
      );
    } else {
      conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return res
          .status(400)
          .json({ message: "No existing conversation found." });
      }

      conversation.messages.push({ role: "user", content: message });
    }

    // OpenAI API interaction to get assistant's response
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

    return res.json({ response: aiResponseMessage, title: conversation.title });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ message: "Error processing message" });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logout successful" });
});

module.exports = router;

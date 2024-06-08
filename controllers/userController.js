const express = require("express");
const router = express.Router();
const User = require("../models/user");
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
          user: { username: userToLogin.username, _id: userToLogin._id },
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
  const { message, conversationHistory } = req.body;
  const currentUser = await User.findOne({ username: username });

  const openai_key = currentUser.openai_key;

  if (openai_key) {
    try {
      // Send request to OpenAI API
      const openaiResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o",
          messages: [
            ...conversationHistory,
            { role: "user", content: message },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${openai_key}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(
        "OpenAI response:",
        openaiResponse.data.choices[0].message.content
      );

      res.json({ response: openaiResponse.data.choices[0].message.content });
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

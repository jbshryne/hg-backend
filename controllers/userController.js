const express = require("express");
const router = express.Router();
const User = require("../models/user");
const bcrypt = require("bcrypt");

router.get("/hi", (req, res) => {
  console.log("hi");
  res.json({ success: false });
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

        res.json({ user: userToLogin, message: "sucesss" });
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

router.get("/get-user-key/:username", async (req, res) => {
  const username = req.params.username;
  const currentUser = await User.findOne({ username: username });

  console.log("currentUser: ", currentUser._id, currentUser.openai_key);

  res.json({ openai_key: currentUser.openai_key, success: true });
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logout successful" });
});

module.exports = router;

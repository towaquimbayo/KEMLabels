const bcrypt = require("bcryptjs");
require("express-async-errors");
const UserModel = require("../models/users");
const logger = require("../utils/logger");
const { generateVerificationUrl } = require("../utils/helpers");
const { sendSignUpEmail } = require("../services/email");

const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      logger("Signin failed: Email or password missing.", "error");
      return res.status(404).json({ msg: "Please enter all fields." });
    }

    const emailLower = email.toLowerCase();
    const user = await UserModel.findOne({ email: emailLower });
    if (!user) {
      logger(
        `Signin failed: User not found for email '${emailLower}'.`,
        "error"
      );
      return res.status(400).json({ msg: "Incorrect email or password." });
    }

    const comparePass = await bcrypt.compare(password, user.password);
    if (!comparePass) {
      logger(
        `Signin failed: Password incorrect for email '${emailLower}'.`,
        "error"
      );
      return res.status(400).json({ msg: "Incorrect email or password." });
    }

    // Check if session exists and destroy it
    if (req.session.user) {
      req.session.destroy((err) => {
        if (err) {
          const error = typeof err === Object ? JSON.stringify(err) : err;
          logger(`Error destroying existing session: ${error}`, "error");
          return res.status(500).json({
            msg: "An unexpected error occurred. Please try again.",
          });
        }
      });
    }

    req.session.user = user;
    await req.session.save((err) => {
      if (err) {
        const error = typeof err === Object ? JSON.stringify(err) : err;
        logger(`Error saving session: ${error}`, "error");
        return res.status(500).json({ msg: "Failed to save session." });
      }
      logger(`User ${emailLower} signed in successfully.`, "info");
      res.status(200).json({
        redirect: user.verified ? "/" : "/verify-email",
        userInfo: {
          username: user.userName,
          creditAmount: user.credits,
          joinedDate: user.createdAt,
          isVerified: user.verified,
        },
      });
    });
  } catch (err) {
    const error = typeof err === Object ? JSON.stringify(err) : err;
    logger(`Error signing in: ${error}`, "error");
    return res.status(500).json({
      msg: err.message || "Internal server error",
    });
  }
};

const logout = (req, res) => {
  try {
    const email = req.session.user.email;
    if (!email) {
      logger("Error logging out: No user found in session.", "error");
      return res.status(404).json({ msg: "No user found in session." });
    }

    req.session.destroy((err) => {
      if (err) {
        const error = typeof err === Object ? JSON.stringify(err) : err;
        logger(`Error logging out: ${error}`, "error");
        return res.status(500).json({ msg: "Error logging out." });
      }
      res.clearCookie("sessionID");
      logger(`User ${email} logged out successfully.`, "info");
      res.status(200).json({ redirect: "/signin" });
    });
  } catch (err) {
    const error = typeof err === Object ? JSON.stringify(err) : err;
    logger(`Error logging out: ${error}`, "error");
    return res.status(500).json({
      msg: err.message || "Internal server error",
    });
  }
};

const signUp = async (req, res) => {
  try {
    const { email, password, userName } = req.body;
    if (!email || !password || !userName) {
      logger("Signup failed: Email, password, or username missing.", "error");
      return res.status(404).json({ msg: "Please enter all fields." });
    }

    const emailLower = email.toLowerCase();
    const userNameLower = userName.toLowerCase();

    const userExists = await UserModel.findOne({ email: emailLower });
    if (userExists) {
      logger(
        `Signup failed: User already exists for email '${emailLower}'.`,
        "error"
      );
      return res.status(400).json({
        msg: "This email is already associated with an account.",
      });
    }

    const userNameExists = await UserModel.findOne({ userName: userNameLower });
    if (userNameExists) {
      logger(
        `Signup failed: Username already exists for username '${userNameLower}'.`,
        "error"
      );
      return res.status(400).json({ msg: "This username is already taken." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new UserModel({
      email: emailLower,
      password: hashedPassword,
      userName: userNameLower,
    });
    await newUser.save();
    logger(`New user created for ${emailLower}.`, "info");

    const verificationUrl = await generateVerificationUrl(newUser._id);
    await sendSignUpEmail(emailLower, verificationUrl);

    req.session.user = newUser;
    await req.session.save((err) => {
      if (err) {
        const error = typeof err === Object ? JSON.stringify(err) : err;
        logger(`Error saving session: ${error}`, "error");
        return res.status(500).json({ msg: "Failed to save session." });
      }
      logger(`User ${emailLower} signed up successfully.`, "info");
      res.status(201).json({ redirect: "/verify-email" });
    });
  } catch (err) {
    const error = typeof err === Object ? JSON.stringify(err) : err;
    logger(`Error signing up: ${error}`, "error");
    return res.status(500).json({
      msg: err.message || "Internal server error",
    });
  }
};

module.exports = { signIn, logout, signUp };

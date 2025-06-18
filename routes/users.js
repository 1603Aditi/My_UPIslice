const express = require('express');
const router = express.Router();
const User=require("../models/user");
const passport=require("passport");
const Friend = require('../models/friend');
const { isLoggedIn } = require('../middleware'); 

router.get('/', (req, res) => {
  res.render("root");
});

router.get('/login',(req,res)=>{
  res.render("users/login");   //login form render
});


router.post('/login', 
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true
  }),
  (req, res) => {
    req.flash("success", "Welcome back buddy!!");
    const redirectUrl = res.locals.redirectUrl || "/main";   //jis protected page se tum yha aae ho vo redirect url ke help se vapis vha jana after logging in
    res.redirect(redirectUrl);
  }
);

router.get('/signup',(req,res)=>{
  res.render("users/signup");
});


router.post('/signup', async (req, res, next) => {
  try {
    const { username, email, password, upiId, phoneno } = req.body;
    // naya user banao with all fields except password
    const newUser = new User({ username, email, upiId, phoneno });
    // phir password ke sath register karo
    const registeredUser = await User.register(newUser, password);
    console.log(registeredUser);
    req.login(registeredUser, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome to UPIslice :)");
      res.redirect("/main");
    });
  } catch (e) {
    req.flash("error", e.message);
    res.redirect("/signup");
  }
});


router.get("/logout",async(req,res,next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","You're logged out");
        res.redirect("/");
    })
});


router.get("/account", (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash("error", "Please login first!");
    return res.redirect("/login");
  }

  res.render("info", { currUser: req.user });
});

// routes/friends.js

router.get("/main", async (req, res) => {
  const friends = await Friend.find({ userId: req.user._id });
  res.render("main", { currentUser: req.user, friends });
});

router.get('/account/edit', isLoggedIn, (req, res) => {
  res.render('account-edit', { currUser: req.user });
});

router.post('/account/edit', isLoggedIn, async (req, res) => {
  const { username, email, phoneno, upiId } = req.body;

  try {
    const user = await User.findById(req.user._id);
    user.username = username;
    user.email = email;
    user.phoneno = phoneno;
    user.upiId = upiId;
    await user.save();
    res.redirect('/main');
  } catch (err) {
    console.error("Error updating user info:", err);
    res.status(500).send("Server Error");
  }
});


module.exports = router;




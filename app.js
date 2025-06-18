const express = require('express');
const app = express();
const session = require('express-session');
const MongoStore=require("connect-mongo");
const flash=require("connect-flash");
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy=require("passport-local");
const path = require("path");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");

const User=require("./models/user.js")
const Bill=require("./models/bill.js");
const BillItem=require("./models/billitem.js")
const Friend=require("./models/friend.js");

app.use(express.urlencoded({ extended: true }));

app.get('/privacy',(req,res)=>{
    res.send("Your data is safe in UPISlice.This project is in development phase..It is not any kind of real company..Please just give it a try..");
})
app.get('/terms',(req,res)=>{
    res.send("This project is in development phase..It is not any kind of real company..Please just give it a try..");
})

const userRouter=require("./routes/users.js");
const friendRouter=require("./routes/friends.js");
const billRouter=require("./routes/bills.js");
const paymentRouter=require("./routes/payments.js");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

// const dbUrl="mongodb://127.0.0.1:27017/UPIslice";

const dbUrl=process.env.ATLASDB_URLN;

const store=MongoStore.create({
    mongoUrl:dbUrl,
    crypto:{
        secret:process.env.SECRET,
    },
    touchAfter:24*3600,
});

const sessionOptions={
    store,
    secret: process.env.SECRET || 'thisisasecret',
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()+7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true,
    },
};

store.on("error", (err) => {
    console.log("Session store error:", err);
});


async function main(){
    await mongoose.connect(dbUrl);
}
main().then(()=>{
    console.log("connected");
}).catch(err=>{
    console.log(err);
});

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
});


app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.get('/explore', (req, res) => {
  res.render('explore');
});

app.use('/', userRouter);          
app.use('/friends', friendRouter);
app.use('/bills', billRouter);
app.use('/payments', paymentRouter); 


app.listen(8080, () => {
  console.log('Server started on http://localhost:8080');
});

//jshint esversion:6
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

//facebook-strategy-------------
const facebookStrategy= require('passport-facebook').Strategy;






const app= express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));


app.use(session({
    secret:"Our Little Secret.",
    resave:false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB")


const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    facebookId:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  
//Google Strategy-------------------
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });




//facebook Strategy-------------------



var FacebookStrategy = require("passport-facebook").Strategy;

passport.use(new FacebookStrategy({
    clientID: 3196529810574804,
    clientSecret:  '861a7ff1a819fa3acc89024ffc451a57',
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    profileFields: ["id", "emails", "name"],
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ facebookId:profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get('/auth/facebook',passport.authenticate('facebook'));


app.get('/failed/login',(req,res,next)=>{
    res.send('login failed!');
})

  app.get(
    "/auth/facebook/secrets",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    
    function (req, res) {
      console.log(req.user, req.isAuthenticated());
      res.redirect('/secrets');
    }
  );

app.get('/logout', (req, res, next) => {
    req.logout();
    console.log(req.isAuthenticated());
    res.render('home');
})



// ---------------------------------------



//array for storing errors
let errors=[];

app.get('/register',(req,res)=>{
    res.render('register',{
        errors:errors
    });
});

app.get('/secrets',(req,res)=>{
    if(req.isAuthenticated())
    {
        res.render('secrets');
    }
    else
    {
        res.redirect('/login');
    }
});


app.post('/register',(req,res)=>{
    
   User.register({username: req.body.username}, req.body.password,(err,user)=>{
        if(err)
        {
            errors.push(err);
            console.log(errors);
            res.render('register',{
                errors:errors
            });
        }
        else
        {
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/secrets');
            });
        }
   });
});

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/login');
  });


app.get('/login',(req,res)=>{
    res.render('login');
})

app.post('/login',(req,res)=>{
    const user= new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user,(err)=>{
        if(err)
        {
            console.log(err);
            res.redirect('/login');
        }
        else
        {
            passport.authenticate('local')(req,res,()=>{
                res.redirect('/secrets');
            });
        }
    })
     

})







app.get('/',(req,res)=>{
    res.send("heelo!");
});


const PORT = process.env.PORT || 3000 ;
app.listen(PORT,(req,res)=>{
    console.log("Server started at port 3000!");
})
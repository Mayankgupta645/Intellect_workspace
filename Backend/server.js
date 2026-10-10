const express = require('express'); 
const mongoose = require('./db/db');
const login = require('./router/loginrouter');
const signup=require('./router/signuprouter');
const app = express();
app.use(express.json());

app.get('/home',(req,res)=>{
    res.send("welcome to intellects workspace");
})
app.use('/login',login);
app.use('/signup',signup);

app.listen('5000',(req,res)=>{
console.log("server is running");
})

const express = require('express'); 
const mongoose = require('./db/db');
const login = require('./router/loginrouter');
const app = express();
app.use(express.json());

app.get('/home',(req,res)=>{
    res.send("welcome to intellects workspace");
})
app.use('/login',login);

app.listen('5000',(req,res)=>{
console.log("server is running");
})

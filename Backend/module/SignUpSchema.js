const db = require('../db/db');
const mongoose = require('mongoose');

const signupSchema = new mongoose.Schema({

    Name:{
        type:String,
        required: true,
    },
    Registration_no:{
        type:String,
        required: true,
        unique: true
    },
    Email:{
        type:String,
        required: true,
        unique: true
    },
    Password:{
        type:String,
        required: true
    },

    Domain:{
        type: String,
        required:true
    },
    Post:{
        type: String,
        required:true
    },
    Year:{
        type:Number,
        required:true
    }

})


const signup_module = mongoose.model('signup',signupSchema);
module.exports =  signup_module;
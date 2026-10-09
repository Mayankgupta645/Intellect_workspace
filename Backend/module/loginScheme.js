const mongoose = require('../db/db');
const loginSchema = new mongoose.Schema({
    Email:{
        type:String, 
        required: true,
        unique: true 
    },

    password:{
        type:String, 
        required:true,
    
    }
})

const loginModel = mongoose.model('login',loginSchema);
module.exports = loginModel;  
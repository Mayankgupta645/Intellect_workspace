const login_module = require('../module/loginScheme');
const express = require('express');
const router = express.Router();
 
router.post('/',async(req,res) => {
    try{
        const{Email,password}=req.body;
        const existinguser=await login_module.findOne({Email});
        if(existinguser){
            return res.status(409).json({
                message:"User already Exists"});
        }
        const newuser=new login_module({
            Email,
            password
        });
        await newuser.save();

        res.staus(201).json({
            message:"user created successfully"
        });
        console.log("new user creatd successfully");

    }
    catch(err){
        res.status(500).json({
            message:"Error in creating user"
        });
        console.log("error in creating new user",err);
    }
});
module.exports=router

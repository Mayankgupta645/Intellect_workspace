const login_module = require('../module/SignUpSchema');
const express = require('express');
const router = express.Router();
 
router.post('/',async(req,res) => {
    try{
        const{Name,Registration_no,Email,Password, Domain,Post,Year}=req.body;
        const existinguser=await login_module.findOne({Email});
        if(existinguser){
            return res.status(409).json({
                message:"User already Exists"});
        }
        const newuser=new login_module({
            Name,
            Registration_no,
            Email,
            Password:Password,
            Domain,
            Post,
            Year
        });
        await newuser.save();

        res.status(201).json({
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

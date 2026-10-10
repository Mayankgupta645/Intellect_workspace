const login_module = require('../module/loginScheme');
const SignUp_module = require('../module/SignUpSchema');
const express = require('express');
const router = express.Router();



router.post('/',async(req,res)=>{   
    try{
        const{Email,password} = req.body;    
         const user = await SignUp_module.findOne({Email,password});
         if(!user){
            return res.status(404).json({message:"user not found"});
         }
         if(user.password !== password || user.Email !== Email){
            return res.status(401).json({message:"invalid password or email"});
         }
            res.status(200).json({"message": "Login Successful"});
            console.log("user logged in successfully");
    }
    catch(err){
        res.status(500).json({message:"error in creating user",error:err});
        console.log("error in creating user",err);  
    }


});

router.get('/',async(req,res)=>{
    try{
    const users = await SignUp_module.find();
    res.status(200).json(users);

}
catch(err){
    res.status(500).json({message:"errror in fetching users",error:err});
} 
});

module.exports = router;
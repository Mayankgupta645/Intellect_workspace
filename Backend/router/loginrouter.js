const login_module = require('../module/loginScheme');
const express = require('express');
const router = express.Router();


router.post('/',async(req,res)=>{   
    try{
        const{Email,password} = req.body;    
        const newuser = new login_module({
            Email,
            password
        });  
        await newuser.save();
        res.status(200).json({message:"user created successfully"});
        console.log("user created successfully");
    }
    catch(err){
        res.status(500).json({message:"error in creating user",error:err});
        console.log("error in creating user",err);  
    }


});

router.get('/',async(req,res)=>{
    try{
    const users = await login_module.find();
    res.status(200).json(users);

}
catch(err){
    res.status(500).json({message:"errror in fetching users",error:err});
} 
});

module.exports = router;
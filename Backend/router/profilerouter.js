const express = require('express');
const Profile_module = require('../module/ProfileScheme');
const router = express.Router();

router.post('/',async(req,res)=>{
    const {Name,email,class:class_name,year,domain,position,profile_pic} = req.body;
    try{
        const newProfile = new Profile_module({
            Name,
            email,
            class:class_name,   
            year,
            domain,
            position,
            profile_pic
        });
        await newProfile.save();
        res.status(201).json(newProfile);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


router.get('/',async(req,res)=>{
    try{
        const profiles = await Profile_module.find();
        res.json(profiles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
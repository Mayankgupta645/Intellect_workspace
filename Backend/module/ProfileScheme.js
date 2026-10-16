const mongoose = require('mongoose');
const Profile_schema = new mongoose.Schema({

Name :{
    type: String,
    require: true
},

email: {
    type: String,
    require: true
},
class: {
    type : String,
    require: true
},
year: {
    type: Number,
    require: true
},

domain:{
    type: String,
    require: true
},
position: {
    type: String,
    require: true
},

profile_pic: {
    type: String,
    require: true
},


});


const profile_module = mongoose.model('profile',Profile_schema);
module.exports = profile_module;
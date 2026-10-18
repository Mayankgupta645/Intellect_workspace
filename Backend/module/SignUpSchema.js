const mongoose = require('mongoose');

const signupSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: true,
        trim: true
    },
    Registration_no: {
        type: String,
        required: function () { return this.Role !== 'admin'; },
        unique: true,
        trim: true
    },
    Email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    Password: {
        type: String,
        required: true,
        select: false
    },
    Domain: {
        type: String,
        required: true,
        trim: true
    },
    Post: {
        type: String,
        required: true,
        trim: true,
        default: 'Member'
    },
    Year: {
        type: Number,
        required: function () { return this.Role !== 'admin'; },
        min: 1,
        max: 4
    },
    Class: {
        type: String,
        required: function () { return this.Role !== 'admin'; },
        trim: true,
        maxlength: 80
    },
    Section: {
        type: String,
        required: function () { return this.Role !== 'admin'; },
        trim: true,
        maxlength: 30
    },
    Role: {
        type: String,
        enum: ['member', 'core', 'admin'],
        default: 'member',
        required: true
    },
    CoreApproval: {
        type: String,
        enum: ['not_required', 'pending', 'approved', 'rejected'],
        default: 'not_required',
        required: true
    },
    ProfilePicture: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('signup', signupSchema);
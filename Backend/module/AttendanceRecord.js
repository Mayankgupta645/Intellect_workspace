const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true
    },
    sessionName: {
        type: String,
        required: true
    },
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'signup',
        required: true
    },
    memberName: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: ''
    },
    className: {
        type: String,
        default: ''
    },
    section: {
        type: String,
        default: ''
    },
    registerNumber: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'Recorded'
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

attendanceRecordSchema.index({ sessionId: 1, memberId: 1 }, { unique: true });

module.exports = mongoose.models.AttendanceRecord
    || mongoose.model('AttendanceRecord', attendanceRecordSchema);

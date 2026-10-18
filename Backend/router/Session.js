const { randomInt, randomUUID } = require('crypto');
const express = require('express');
const AttendanceRecord = require('../module/AttendanceRecord');
const SignUp_module = require('../module/SignUpSchema');
const { requireCoreAccess, requireSession } = require('../module/auth');

const router = express.Router();
const session = {
    active: false,
    id: null,
    code: null
};

function publicRecord(record) {
    return {
        id: String(record._id),
        sessionId: record.sessionId,
        sessionName: record.sessionName,
        memberId: String(record.memberId),
        memberName: record.memberName,
        role: record.role,
        className: record.className,
        section: record.section,
        registerNumber: record.registerNumber,
        email: record.email,
        status: record.status,
        attendanceStatus: record.status,
        date: record.date
    };
}

router.get('/status', requireSession, (req, res) => {
    return res.json({
        active: session.active,
        sessionName: session.active ? 'Attendance' : null
    });
});

router.post('/admin/activate', requireSession, requireCoreAccess, (req, res) => {
    const alreadyActive = session.active;
    if (!alreadyActive) {
        session.active = true;
        session.id = randomUUID();
    }
    if (!session.code) session.code = String(randomInt(100000, 1000000));
    return res.json({
        message: alreadyActive ? 'Attendance session is already active.' : 'Attendance session activated.',
        active: true,
        sessionName: 'Attendance',
        code: session.code,
        session: { id: session.id, name: 'Attendance' }
    });
});

router.post('/admin/generate-code', requireSession, requireCoreAccess, (req, res) => {
    if (!session.active) {
        return res.status(409).json({
            message: 'Activate the attendance session before generating a code.',
            code: 'SESSION_INACTIVE'
        });
    }

    session.code = String(randomInt(100000, 1000000));
    return res.json({
        message: 'Attendance code generated.',
        code: session.code,
        session: { id: session.id, name: 'Attendance' }
    });
});

router.post('/admin/deactivate', requireSession, requireCoreAccess, (req, res) => {
    session.active = false;
    session.id = null;
    session.code = null;
    return res.json({
        message: 'Attendance session deactivated.',
        active: false
    });
});

router.post('/submit', requireSession, async (req, res) => {
    if (!session.active) {
        return res.status(409).json({
            message: 'Attendance is currently closed.',
            code: 'SESSION_INACTIVE'
        });
    }
    if (!session.code) {
        return res.status(409).json({
            message: 'The administrator has not generated an attendance code yet.',
            code: 'CODE_NOT_GENERATED'
        });
    }

    const submittedCode = req.body?.code;
    if (typeof submittedCode !== 'string' || submittedCode.trim() !== session.code) {
        return res.status(400).json({
            message: 'That attendance code is invalid.',
            code: 'INVALID_CODE'
        });
    }

    try {
        const user = await SignUp_module.findById(req.userId).select('Name Registration_no Email Role Post Class Section');
        if (!user) {
            return res.status(401).json({ message: 'Sign in to continue.', code: 'UNAUTHENTICATED' });
        }
        const record = await AttendanceRecord.create({
            sessionId: session.id,
            sessionName: 'Attendance',
            memberId: user._id,
            memberName: user.Name,
            role: user.Post || user.Role || '',
            className: user.Class || '',
            section: user.Section || '',
            registerNumber: user.Registration_no || '',
            email: user.Email,
            status: 'Recorded',
            date: new Date()
        });
        return res.status(201).json({
            message: 'Attendance confirmed.',
            attendanceStatus: 'recorded',
            record: publicRecord(record),
            date: record.date
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Attendance has already been recorded for this session.',
                code: 'DUPLICATE_ATTENDANCE'
            });
        }
        console.error('Attendance submission failed:', error.message);
        return res.status(500).json({ message: 'Unable to record attendance.' });
    }
});

router.get('/history', requireSession, async (req, res) => {
    try {
        const records = await AttendanceRecord.find({ memberId: req.userId })
            .sort({ date: -1 })
            .lean();
        return res.json({ records: records.map(publicRecord) });
    } catch (error) {
        console.error('Attendance history lookup failed:', error.message);
        return res.status(500).json({ message: 'Unable to load attendance history.' });
    }
});

router.get('/admin/records', requireSession, requireCoreAccess, async (req, res) => {
    try {
        const records = await AttendanceRecord.find()
            .sort({ date: -1 })
            .lean();
        const results = records.map(publicRecord);
        return res.json({ records: results, totalRecords: results.length });
    } catch (error) {
        console.error('Admin attendance records lookup failed:', error.message);
        return res.status(500).json({ message: 'Unable to load attendance records.' });
    }
});

module.exports = router;

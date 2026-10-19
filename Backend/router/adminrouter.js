const express = require('express');
const SignUp_module = require('../module/SignUpSchema');
const { publicUser, requireAdmin, requireCoreAccess, requireSession, revokeUserSessions } = require('../module/auth');
const router = express.Router();

router.get('/members', requireSession, requireCoreAccess, async (req, res) => {
    try {
        const users = await SignUp_module.find({
            $or: [
                { Role: { $in: ['member', 'core'] } },
                { Role: { $exists: false } }
            ]
        })
            .sort({ createdAt: -1 })
            .select('Name Registration_no Email Domain Post Year Role CoreApproval');
        return res.json({ users: users.map(publicUser) });
    } catch (error) {
        console.error('Member directory lookup failed:', error.message);
        return res.status(500).json({ message: 'Unable to load registered members.' });
    }
});

router.delete('/members', requireSession, requireAdmin, async (req, res) => {
    const { userId } = req.body || {};
    if (typeof userId !== 'string' || !/^[a-f\d]{24}$/i.test(userId)) {
        return res.status(400).json({ message: 'Choose a valid member account to remove.', code: 'INVALID_MEMBER' });
    }

    try {
        const member = await SignUp_module.findOneAndDelete({
            _id: userId,
            $or: [
                { Role: { $in: ['member', 'core'] } },
                { Role: { $exists: false } }
            ]
        });
        if (!member) {
            return res.status(404).json({ message: 'That member account was not found.', code: 'MEMBER_NOT_FOUND' });
        }
        revokeUserSessions(member._id);
        return res.json({ message: 'Member account removed.' });
    } catch (error) {
        console.error('Member account removal failed:', error.message);
        return res.status(500).json({ message: 'Unable to remove the member account.' });
    }
});

router.get('/core-applications', requireSession, requireAdmin, async (req, res) => {
    try {
        const applicants = await SignUp_module.find({ Role: 'core', CoreApproval: 'pending' })
            .sort({ createdAt: 1 })
            .select('Name Registration_no Email Domain Year Role CoreApproval createdAt');
        return res.json({ applications: applicants.map(publicUser) });
    } catch (error) {
        console.error('Core Team application lookup failed:', error.message);
        return res.status(500).json({ message: 'Unable to load Core Team applications.' });
    }
});

router.patch('/core-applications', requireSession, requireAdmin, async (req, res) => {
    const { userId, decision } = req.body || {};
    if (typeof userId !== 'string' || !['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ message: 'Choose an applicant and approve or reject the request.', code: 'INVALID_DECISION' });
    }

    try {
        const applicant = decision === 'rejected'
            ? await SignUp_module.findOneAndDelete({ _id: userId, Role: 'core', CoreApproval: 'pending' })
            : await SignUp_module.findOneAndUpdate(
                { _id: userId, Role: 'core', CoreApproval: 'pending' },
                { $set: { CoreApproval: decision } },
                { new: true, runValidators: true }
            );
        if (!applicant) {
            return res.status(404).json({ message: 'That pending Core Team request was not found.', code: 'APPLICATION_NOT_FOUND' });
        }
        if (decision === 'rejected') revokeUserSessions(applicant._id);
        return res.json({
            message: decision === 'approved'
                ? 'Core Team access approved.'
                : 'Core Team request rejected and account removed. Please sign up using account type Member, not Core Team.',
            ...(decision === 'approved' ? { user: publicUser(applicant) } : {})
        });
    } catch (error) {
        console.error('Core Team application decision failed:', error.message);
        return res.status(500).json({ message: 'Unable to update the Core Team request.' });
    }
});

module.exports = router;

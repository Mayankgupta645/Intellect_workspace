const express = require('express');
const SignUp_module = require('../module/SignUpSchema');
const { caseInsensitiveExact, clearSession, createSession, hashPassword, publicUser, setSessionCookie, verifyPassword } = require('../module/auth');
const router = express.Router();

router.post('/', async (req, res) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const requestedRole = req.body?.role || 'member';
    if (!email || !password || !['member', 'core'].includes(requestedRole)) {
        return res.status(400).json({ message: 'Enter your email and password.', code: 'INVALID_CREDENTIALS' });
    }

    try {
        const user = await SignUp_module.findOne({ Email: caseInsensitiveExact(email) }).select('+Password');
        if (!user || !(await verifyPassword(password, user.Password))) {
            return res.status(401).json({ message: 'Email or password is incorrect.', code: 'INVALID_CREDENTIALS' });
        }
        if (!user.Password.startsWith('scrypt$')) {
            user.Password = await hashPassword(password);
            await user.save();
        }
        if (requestedRole === 'member' && user.Role !== 'member') {
            return res.status(403).json({ message: 'This account cannot sign in through the member portal.', code: 'ROLE_MISMATCH' });
        }
        if (requestedRole === 'core' && user.Role === 'member') {
            return res.status(403).json({ message: 'Member accounts cannot sign in to the Core Team portal.', code: 'ROLE_MISMATCH' });
        }
        if (user.Role === 'core' && user.CoreApproval !== 'approved') {
            const pending = user.CoreApproval === 'pending';
            return res.status(403).json({
                message: pending ? 'Your Core Team request is waiting for administrator approval.' : 'Your Core Team request was not approved.',
                code: pending ? 'CORE_PENDING' : 'CORE_REJECTED'
            });
        }
        const token = createSession(user._id);
        setSessionCookie(res, token);
        return res.status(200).json({ message: 'Login successful.', user: publicUser(user) });
    } catch (error) {
        console.error('Login failed:', error.message);
        return res.status(500).json({ message: 'Unable to sign in right now.' });
    }
});

router.post('/logout', (req, res) => {
    clearSession(req, res);
    return res.status(200).json({ message: 'Logged out.' });
});

module.exports = router;
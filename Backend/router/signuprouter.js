const SignUp_module = require('../module/SignUpSchema');
const express = require('express');
const { caseInsensitiveExact, hashPassword, publicUser } = require('../module/auth');
const router = express.Router();

router.post('/', async (req, res) => {
    const { name, registerNumber, email, password, domain, year } = req.body || {};
    const className = typeof req.body?.class === 'string' ? req.body.class.trim() : '';
    const section = typeof req.body?.section === 'string' ? req.body.section.trim() : '';
    const role = req.body?.role || 'member';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const numericYear = Number(year);
    if (
        typeof name !== 'string' || !name.trim()
        || typeof registerNumber !== 'string' || !registerNumber.trim()
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        || typeof password !== 'string' || password.length < 12
        || !/[A-Z]/.test(password) || !/[a-z]/.test(password)
        || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)
        || typeof domain !== 'string' || !domain.trim()
        || !['member', 'core'].includes(role)
        || !Number.isInteger(numericYear) || numericYear < 1 || numericYear > 4
        || typeof req.body?.class !== 'string' || !className
        || typeof req.body?.section !== 'string' || !section
        || className.length > 80 || section.length > 30
    ) {
        return res.status(400).json({ message: 'Check the registration details and password requirements.', code: 'INVALID_REGISTRATION' });
    }

    try {
        const existingUser = await SignUp_module.findOne({
            $or: [
                { Email: caseInsensitiveExact(normalizedEmail) },
                { Registration_no: registerNumber.trim() }
            ]
        });
        if (existingUser) {
            return res.status(409).json({ message: 'An account already uses that email or register number.', code: 'ACCOUNT_EXISTS' });
        }

        const user = await SignUp_module.create({
            Name: name.trim(),
            Registration_no: registerNumber.trim(),
            Email: normalizedEmail,
            Password: await hashPassword(password),
            Domain: domain.trim(),
            Post: role === 'core' ? 'Core Team Applicant' : 'Member',
            Year: numericYear,
            Class: className,
            Section: section,
            Role: role,
            CoreApproval: role === 'core' ? 'pending' : 'not_required'
        });
        return res.status(201).json({
            message: role === 'core'
                ? 'Account created. Your Core Team request is waiting for administrator approval.'
                : 'Member account created successfully.',
            user: publicUser(user)
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'An account already uses that email or register number.', code: 'ACCOUNT_EXISTS' });
        }
        console.error('Registration failed:', error.message);
        return res.status(500).json({ message: 'Unable to create the account right now.' });
    }
});

module.exports=router

const express = require('express');
const SignUp_module = require('../module/SignUpSchema');
const { caseInsensitiveExact, publicUser, requireSession } = require('../module/auth');
const router = express.Router();

const editableFields = {
    name: 'Name',
    registerNumber: 'Registration_no',
    email: 'Email',
    domain: 'Domain',
    post: 'Post',
    year: 'Year',
    profilePicture: 'ProfilePicture'
};

function parseProfilePicture(value) {
    if (value === '') return '';
    if (typeof value !== 'string') return null;

    const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
    if (!match || match[2].length % 4 !== 0) return null;
    const image = Buffer.from(match[2], 'base64');
    if (image.length > 2 * 1024 * 1024 || image.toString('base64') !== match[2]) return null;

    const isJpeg = match[1] === 'jpeg' && image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff;
    const isPng = match[1] === 'png' && image.length >= 8 && image.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = match[1] === 'webp' && image.length >= 12 && image.toString('ascii', 0, 4) === 'RIFF' && image.toString('ascii', 8, 12) === 'WEBP';
    return isJpeg || isPng || isWebp ? value : null;
}

router.get('/me', requireSession, async (req, res) => {
    try {
        const user = await SignUp_module.findById(req.userId);
        if (!user) return res.status(401).json({ message: 'Your account is no longer available.', code: 'UNAUTHENTICATED' });
        return res.json({ user: publicUser(user) });
    } catch (error) {
        console.error('Current profile lookup failed:', error.message);
        return res.status(500).json({ message: 'Unable to load your profile right now.' });
    }
});

router.patch('/', requireSession, async (req, res) => {
    const entries = Object.entries(req.body || {});
    if (!entries.length || entries.some(([field]) => !Object.hasOwn(editableFields, field))) {
        return res.status(400).json({ message: 'Choose one or more supported profile fields to update.', code: 'INVALID_PROFILE_UPDATE' });
    }

    const updates = {};
    for (const [field, value] of entries) {
        if (field === 'year') {
            const year = Number(value);
            if (!Number.isInteger(year) || year < 1 || year > 4) {
                return res.status(400).json({ message: 'Year must be between 1 and 4.', code: 'INVALID_PROFILE_UPDATE' });
            }
            updates.Year = year;
        } else if (field === 'profilePicture') {
            const profilePicture = parseProfilePicture(value);
            if (profilePicture === null) {
                return res.status(400).json({ message: 'Upload a valid JPEG, PNG, or WebP image no larger than 2 MB.', code: 'INVALID_PROFILE_IMAGE' });
            }
            updates.ProfilePicture = profilePicture;
        } else if (typeof value !== 'string' || !value.trim()) {
            return res.status(400).json({ message: `${field} must not be empty.`, code: 'INVALID_PROFILE_UPDATE' });
        } else {
            updates[editableFields[field]] = value.trim();
        }
    }

    if (updates.Email) {
        updates.Email = updates.Email.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.Email)) {
            return res.status(400).json({ message: 'Enter a valid email address.', code: 'INVALID_PROFILE_UPDATE' });
        }
    }

    try {
        const user = await SignUp_module.findById(req.userId);
        if (!user) return res.status(401).json({ message: 'Your account is no longer available.', code: 'UNAUTHENTICATED' });
        if (updates.Email || updates.Registration_no) {
            const duplicate = await SignUp_module.findOne({
                _id: { $ne: user._id },
                $or: [
                    ...(updates.Email ? [{ Email: caseInsensitiveExact(updates.Email) }] : []),
                    ...(updates.Registration_no ? [{ Registration_no: updates.Registration_no }] : [])
                ]
            });
            if (duplicate) return res.status(409).json({ message: 'That email or register number is already in use.', code: 'ACCOUNT_EXISTS' });
        }
        Object.assign(user, updates);
        await user.save();
        return res.json({ message: 'Profile updated successfully.', user: publicUser(user) });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'That email or register number is already in use.', code: 'ACCOUNT_EXISTS' });
        }
        console.error('Profile update failed:', error.message);
        return res.status(500).json({ message: 'Unable to update your profile right now.' });
    }
});

module.exports = router;
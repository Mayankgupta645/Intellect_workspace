const { randomBytes, scrypt: scryptCallback, timingSafeEqual } = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(scryptCallback);
const sessions = new Map();
const sessionCookie = 'intellects_session';
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const passwordHashPrefix = 'scrypt';
const passwordHashLength = 64;

function caseInsensitiveExact(value) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}$`, 'i');
}

async function hashPassword(password) {
    const salt = randomBytes(16);
    const hash = await scrypt(password, salt, passwordHashLength, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return `${passwordHashPrefix}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

async function verifyPassword(password, storedPassword) {
    if (typeof storedPassword !== 'string') return false;
    const [prefix, saltText, hashText] = storedPassword.split('$');
    if (prefix !== passwordHashPrefix || !saltText || !hashText) {
        const candidate = Buffer.from(password);
        const stored = Buffer.from(storedPassword);
        return candidate.length === stored.length && timingSafeEqual(candidate, stored);
    }

    const salt = Buffer.from(saltText, 'base64');
    const expected = Buffer.from(hashText, 'base64');
    if (expected.length !== passwordHashLength || salt.length !== 16) return false;
    const actual = await scrypt(password, salt, passwordHashLength, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    return timingSafeEqual(actual, expected);
}

function createSession(userId) {
    const now = Date.now();
    for (const [token, session] of sessions) {
        if (session.expiresAt <= now) sessions.delete(token);
    }
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { userId: String(userId), expiresAt: now + sessionLifetimeMs });
    return token;
}

function revokeUserSessions(userId) {
    const id = String(userId);
    for (const [token, session] of sessions) {
        if (session.userId === id) sessions.delete(token);
    }
}

function sessionTokenFromRequest(req) {
    const cookies = String(req.headers.cookie || '').split(';');
    const cookie = cookies.map((item) => item.trim()).find((item) => item.startsWith(`${sessionCookie}=`));
    return cookie ? cookie.slice(sessionCookie.length + 1) : '';
}

function requireSession(req, res, next) {
    const token = sessionTokenFromRequest(req);
    const session = sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
        if (token) sessions.delete(token);
        return res.status(401).json({ message: 'Sign in to continue.', code: 'UNAUTHENTICATED' });
    }
    req.userId = session.userId;
    next();
}

function setSessionCookie(res, token) {
    const cookiePolicy = process.env.NODE_ENV === 'production' ? '; Secure; SameSite=None' : '; SameSite=Lax';
    res.setHeader('Set-Cookie', `${sessionCookie}=${token}; HttpOnly${cookiePolicy}; Path=/; Max-Age=${sessionLifetimeMs / 1000}`);
}

function clearSession(req, res) {
    const token = sessionTokenFromRequest(req);
    if (token) sessions.delete(token);
    const cookiePolicy = process.env.NODE_ENV === 'production' ? '; Secure; SameSite=None' : '; SameSite=Lax';
    res.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly${cookiePolicy}; Path=/; Max-Age=0`);
}

function publicUser(user) {
    return {
        id: String(user._id),
        name: user.Name,
        registerNumber: user.Registration_no,
        email: user.Email,
        domain: user.Domain,
        post: user.Post,
        year: user.Year,
        class: user.Class || '',
        section: user.Section || '',
        role: user.Role || 'member',
        coreApproval: user.CoreApproval || 'not_required',
        profilePicture: user.ProfilePicture || '',
        editableFields: user.Role === 'admin' ? [] : ['name', 'registerNumber', 'email', 'domain', 'post', 'year', 'profilePicture']
    };
}

async function requireAdmin(req, res, next) {
    try {
        const User = require('./SignUpSchema');
        const user = await User.findById(req.userId);
        if (!user || user.Role !== 'admin') {
            return res.status(403).json({ message: 'Administrator access is required.', code: 'ADMIN_REQUIRED' });
        }
        req.authUser = user;
        return next();
    } catch (error) {
        console.error('Administrator authorization failed:', error.message);
        return res.status(500).json({ message: 'Unable to verify administrator access.' });
    }
}

async function requireCoreAccess(req, res, next) {
    try {
        const User = require('./SignUpSchema');
        const user = await User.findById(req.userId);
        const hasCoreAccess = user?.Role === 'admin'
            || (user?.Role === 'core' && user.CoreApproval === 'approved');
        if (!hasCoreAccess) {
            return res.status(403).json({ message: 'Approved Core Team access is required.', code: 'CORE_ACCESS_REQUIRED' });
        }
        req.authUser = user;
        return next();
    } catch (error) {
        console.error('Core Team authorization failed:', error.message);
        return res.status(500).json({ message: 'Unable to verify Core Team access.' });
    }
}

module.exports = {
    clearSession,
    caseInsensitiveExact,
    createSession,
    hashPassword,
    publicUser,
    requireAdmin,
    requireCoreAccess,
    requireSession,
    revokeUserSessions,
    setSessionCookie,
    verifyPassword
};

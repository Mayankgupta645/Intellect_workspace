require('dotenv').config();
const express = require('express');
const mongoose = require('./db/db');
const SignUp_module = require('./module/SignUpSchema');
const { caseInsensitiveExact, hashPassword, verifyPassword } = require('./module/auth');
const login = require('./router/loginrouter');
const signup = require('./router/signuprouter');
const profile = require('./router/profilerouter');
const admin = require('./router/adminrouter');
const attendance = require('./router/Session');
const app = express();
const allowedOrigins = new Set([
    'https://intellect-workspace-frontend.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://[::1]:5173',
    ...(process.env.FRONTEND_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
]);

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.has(origin)) return res.sendStatus(403);
    if (origin && allowedOrigins.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
        if (!origin || !allowedOrigins.has(origin)) return res.sendStatus(403);
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.sendStatus(204);
    }
    return next();
});
app.use(express.json({ limit: '3mb' }));

app.get('/home', (req, res) => res.send('welcome to intellects workspace'));
app.use('/login', login);
app.use('/signup', signup);
app.use('/profile', profile);
app.use('/admin', admin);
app.use('/attendance', attendance);

async function bootstrapAdmin() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email && !password) {
        console.warn('ADMIN_EMAIL and ADMIN_PASSWORD are not configured; no initial administrator was created.');
        return;
    }
    if (
        !email
        || !password
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || password.length < 12
        || !/[A-Z]/.test(password)
        || !/[a-z]/.test(password)
        || !/\d/.test(password)
        || !/[^A-Za-z0-9]/.test(password)
    ) {
        throw new Error('Set a valid ADMIN_EMAIL and an ADMIN_PASSWORD with 12+ characters, upper/lowercase letters, a number, and a special character.');
    }

    let adminUser = await SignUp_module.findOne({ Email: caseInsensitiveExact(email) }).select('+Password');
    if (!adminUser) {
        adminUser = new SignUp_module({
            Name: 'Workspace Admin',
            Registration_no: `ADMIN-${email}`,
            Email: email,
            Password: await hashPassword(password),
            Domain: 'Core Team',
            Post: 'Administrator',
            Year: 1,
            Role: 'admin',
            CoreApproval: 'approved'
        });
        await adminUser.save();
        console.log('Initial administrator account created from environment configuration.');
        return;
    }

    const passwordMatches = adminUser.Password?.startsWith('scrypt$')
        && await verifyPassword(password, adminUser.Password);
    adminUser.Role = 'admin';
    adminUser.CoreApproval = 'approved';
    adminUser.Domain = 'Core Team';
    adminUser.Post = 'Administrator';
    adminUser.Year = adminUser.Year || 1;
    adminUser.Registration_no = adminUser.Registration_no || `ADMIN-${email}`;
    if (!passwordMatches) adminUser.Password = await hashPassword(password);
    await adminUser.save();
    console.log('Initial administrator account verified from environment configuration.');
}

async function start() {
    await mongoose.connection.asPromise();
    console.log('Connected to database');
    await bootstrapAdmin();
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Server is running on port ${port}`));
}

start().catch(async (error) => {
    console.error('Server startup failed:', error.message);
    await mongoose.disconnect();
    process.exitCode = 1;
});

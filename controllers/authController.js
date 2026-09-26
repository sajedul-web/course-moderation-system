const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Reviewer } = require('../models');

exports.register = async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'fullName, email and password are required.' });
        }

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'That email is already registered.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            fullName,
            email,
            passwordHash,
            role: role || 'lecturer',
        });

        // Reviewers get a linked Reviewer record automatically.
        if (user.role === 'reviewer') {
            await Reviewer.create({ userId: user.id });
        }

        res.status(201).json({
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required.' });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

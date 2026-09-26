require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const reviewerRoutes = require('./routes/reviewerRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

app.use(cors()); // allows the GitHub Pages front-end to call this API cross-origin
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reviewers', reviewerRoutes);
app.use('/api/audit-logs', auditRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Course Moderation System API is running.' });
});

// --- 404 handler ---
// Anything that didn't match a route above falls through to here, as JSON
// instead of Express's default HTML error page (which would break every
// front-end fetch() call trying to JSON.parse an HTML response).
app.use((req, res) => {
    res.status(404).json({ error: `No route matches ${req.method} ${req.originalUrl}.` });
});

// --- Global error handler ---
// Catches anything thrown or passed to next(err) that a route's own
// try/catch didn't handle — most importantly, Multer's own errors (e.g. a
// file over the 20MB limit), which are thrown by the upload middleware
// BEFORE a controller's try/catch ever runs.
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File is too large. Maximum size is 20MB.' });
        }
        return res.status(400).json({ error: `File upload error: ${err.message}` });
    }

    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
});

module.exports = app;

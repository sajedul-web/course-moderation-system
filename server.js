require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');

const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

app.use(cors()); // allows the GitHub Pages front-end to call this API cross-origin
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Course Moderation System API is running.' });
});

const PORT = process.env.PORT || 5000;

sequelize
    .authenticate()
    .then(() => {
        console.log('Database connected.');
        app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error('Unable to connect to the database:', err.message);
        process.exit(1);
    });

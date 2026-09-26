const app = require('./app');
const { sequelize } = require('./models');

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

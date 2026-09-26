const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const safeName = Date.now() + '_' + file.originalname.replace(/[^A-Za-z0-9._-]/g, '_');
        cb(null, safeName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

module.exports = upload;

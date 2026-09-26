const jwt = require('jsonwebtoken');

/** Verifies the Bearer token and attaches the decoded user to req.user. */
function authenticate(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }

    const token = header.split(' ')[1];

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

/** Restricts a route to one or more roles, e.g. authorize('reviewer', 'admin'). */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to perform this action.' });
        }
        next();
    };
}

module.exports = { authenticate, authorize };

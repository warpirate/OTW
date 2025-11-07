const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.error('JWT verification error:', err.message);
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        
        // Support tokens that use different claim keys for user ID
        const userId = decoded.userId || decoded.id || decoded.user_id;
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token payload' 
            });
        }

        // Normalize user object with consistent structure
        req.user = {
            id: userId,
            email: decoded.email,
            role: decoded.role || decoded.userType || 'customer',
            role_id: decoded.role_id,
            name: decoded.name
        };
        
        next();
    });
};

const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }

    if (req.user.role !== 'super admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Super admin access required' 
        });
    }

    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'super admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }

    next();
};

module.exports = {
    authenticateToken,
    requireSuperAdmin,
    requireAdmin
};

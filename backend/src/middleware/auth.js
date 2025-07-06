const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = function (req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if no token
    if (!token) {
        console.log("❌ No token provided");
        return res.status(401).json({
            msg: 'No token, authorization denied',
            success: false
        });
    }

    // Verify token
    try {
        console.log("🔍 Verifying token:", token.substring(0, 20) + '...');

        // ✅ FIX: Use consistent JWT_SECRET
        const jwtSecret = process.env.JWT_SECRET || 'railway-super-secure-jwt-secret-2024';
        console.log("🔑 Using JWT secret length:", jwtSecret.length);

        const decoded = jwt.verify(token, jwtSecret);
        console.log("🔍 Decoded token structure:", Object.keys(decoded));

        // ✅ FIX: Handle different token structures
        if (decoded.user) {
            // New structure: { user: { walletAddress, email, isAdmin } }
            req.user = decoded.user;
        } else if (decoded.walletAddress) {
            // Old structure: { walletAddress, email, isAdmin }
            req.user = decoded;
        } else {
            // Unknown structure
            console.error("❌ Unknown token structure:", decoded);
            throw new Error('Invalid token structure - missing user data');
        }

        console.log("✅ Token verified for user:", {
            walletAddress: req.user.walletAddress,
            email: req.user.email,
            isAdmin: req.user.isAdmin
        });

        next();

    } catch (err) {
        console.error("❌ Token verification error:", err.message);
        console.error("❌ Error type:", err.name);

        // ✅ FIX: Detailed error response
        let errorMsg = 'Token is not valid';
        let errorCode = 401;

        if (err.name === 'TokenExpiredError') {
            errorMsg = 'Token has expired';
        } else if (err.name === 'JsonWebTokenError') {
            errorMsg = 'Invalid token format';
        } else if (err.message.includes('jwt malformed')) {
            errorMsg = 'Malformed token';
        } else if (err.message.includes('invalid signature')) {
            errorMsg = 'Invalid token signature';
        }

        res.status(errorCode).json({
            msg: errorMsg,
            success: false,
            tokenReceived: !!token,
            tokenLength: token ? token.length : 0,
            // Include detailed error in development
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
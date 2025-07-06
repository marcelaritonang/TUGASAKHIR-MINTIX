const jwt = require('jsonwebtoken');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const User = require('../models/User');
const { TextEncoder } = require('util');
require('dotenv').config();

// Generate nonce for wallet signing
exports.getNonce = async (req, res) => {
    try {
        const nonce = Math.floor(Math.random() * 1000000).toString();
        // In a production app, store this in Redis or a session store
        req.session = req.session || {};
        req.session.nonce = nonce;

        console.log('🎯 Generated nonce:', nonce);
        res.json({ nonce, success: true });
    } catch (error) {
        console.error('❌ getNonce error:', error);
        res.status(500).json({
            msg: 'Error generating nonce',
            success: false,
            error: error.message
        });
    }
};

// Login with wallet
exports.login = async (req, res) => {
    try {
        // ✅ FIX: Support both naming conventions
        const { wallet_address, walletAddress, signature, message } = req.body;
        const userWalletAddress = walletAddress || wallet_address;

        console.log('🔐 Wallet login attempt:', userWalletAddress);

        if (!userWalletAddress || !signature || !message) {
            return res.status(400).json({
                msg: 'Wallet address, signature, and message required',
                success: false
            });
        }

        // Verify wallet signature
        const messageUint8 = new TextEncoder().encode(message);
        const signatureUint8 = bs58.decode(signature);
        const publicKeyUint8 = bs58.decode(userWalletAddress);

        const verified = nacl.sign.detached.verify(
            messageUint8,
            signatureUint8,
            publicKeyUint8
        );

        if (!verified) {
            console.log('❌ Invalid signature for wallet:', userWalletAddress);
            return res.status(401).json({
                msg: 'Invalid signature',
                success: false
            });
        }

        // Find or create user
        let user = await User.findOne({ walletAddress: userWalletAddress });

        if (!user) {
            console.log('👤 Creating new user:', userWalletAddress);
            user = new User({
                walletAddress: userWalletAddress,
                isAdmin: false // Default non-admin
            });
            await user.save();
        }

        // Update last login
        user.lastLogin = Date.now();
        await user.save();

        // Generate JWT token with consistent structure
        const payload = {
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                isAdmin: user.isAdmin,
                email: user.email || null
            }
        };

        // ✅ FIX: Use consistent JWT_SECRET
        const jwtSecret = process.env.JWT_SECRET || 'railway-super-secure-jwt-secret-2024';

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error('❌ JWT sign error:', err);
                    return res.status(500).json({
                        msg: 'Error generating token',
                        success: false
                    });
                }

                console.log('✅ Login successful for:', userWalletAddress);
                res.json({
                    token,
                    user: payload.user,
                    success: true,
                    msg: 'Login successful'
                });
            }
        );
    } catch (err) {
        console.error('❌ Login error:', err.message);
        res.status(500).json({
            msg: 'Server error during login',
            success: false,
            error: err.message
        });
    }
};

// Check admin status
exports.checkAdmin = async (req, res) => {
    try {
        console.log('🔍 Admin check for user:', req.user);

        const user = await User.findOne({ walletAddress: req.user.walletAddress });

        if (!user) {
            console.log('❌ User not found for admin check:', req.user.walletAddress);
            return res.status(404).json({
                msg: 'User not found',
                isAdmin: false,
                success: false
            });
        }

        console.log('✅ Admin check result:', { walletAddress: user.walletAddress, isAdmin: user.isAdmin });
        res.json({
            isAdmin: user.isAdmin,
            walletAddress: user.walletAddress,
            success: true
        });
    } catch (err) {
        console.error('❌ Admin check error:', err.message);
        res.status(500).json({
            msg: 'Server error during admin check',
            success: false,
            error: err.message
        });
    }
};

// ✅ ENHANCED: Test login route with multiple options
exports.loginTest = async (req, res) => {
    try {
        // Support multiple input formats
        const {
            wallet_address,
            walletAddress,
            email,
            password
        } = req.body;

        // Determine user identifier
        const userIdentifier = walletAddress || wallet_address || email;

        if (!userIdentifier) {
            return res.status(400).json({
                msg: 'Wallet address or email required',
                success: false,
                received: req.body
            });
        }

        console.log("🧪 Login test for:", userIdentifier);

        // For email-based testing, use email as walletAddress
        const testWalletAddress = userIdentifier.includes('@')
            ? `test-wallet-${userIdentifier.replace('@', '-').replace('.', '-')}`
            : userIdentifier;

        // Find or create user
        let user = await User.findOne({ walletAddress: testWalletAddress });

        if (!user) {
            console.log("👤 Creating new test user:", testWalletAddress);
            user = new User({
                walletAddress: testWalletAddress,
                email: email || userIdentifier,
                isAdmin: true // Make admin for testing
            });
            await user.save();
        } else {
            console.log("👤 Found existing user:", user.walletAddress);
            // Ensure user is admin for testing
            if (!user.isAdmin) {
                user.isAdmin = true;
                await user.save();
                console.log("✅ Updated user to admin");
            }
        }

        // Generate JWT token with consistent structure
        const payload = {
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                email: user.email,
                isAdmin: user.isAdmin
            }
        };

        // ✅ FIX: Use consistent JWT_SECRET
        const jwtSecret = process.env.JWT_SECRET || 'railway-super-secure-jwt-secret-2024';

        jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '24h' },
            (err, token) => {
                if (err) {
                    console.error("❌ JWT sign error:", err);
                    return res.status(500).json({
                        msg: 'Error generating token',
                        success: false,
                        error: err.message
                    });
                }

                console.log("✅ Test login successful:", {
                    walletAddress: user.walletAddress,
                    email: user.email,
                    isAdmin: user.isAdmin
                });

                res.json({
                    token,
                    user: payload.user,
                    success: true,
                    msg: 'Test login successful'
                });
            }
        );
    } catch (err) {
        console.error('❌ Test login error:', err.message);
        res.status(500).json({
            msg: 'Server error during test login',
            success: false,
            error: err.message
        });
    }
};
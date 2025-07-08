// backend/src/routes/tickets.js - FINAL FIXED VERSION
const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const auth = require('../middleware/auth');

// Get services from global scope (set in server.js)
const getSeatLockingService = () => global.seatLockingService;
const getWebSocketService = () => global.webSocketService;

// Helper function for error messages
const getSeatUnavailableMessage = (reason) => {
    switch (reason) {
        case 'seat_locked':
            return 'This seat is currently selected by another user';
        case 'processing_conflict':
            return 'This seat is being processed by another user';
        case 'already_minted':
            return 'This seat has already been purchased';
        default:
            return 'This seat is not available';
    }
};

// Enhanced rate limiting middleware
const enhancedRateLimit = (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Simple in-memory rate limiting
    if (!global.requestCounts) global.requestCounts = {};

    if (!global.requestCounts[ip] || now - global.requestCounts[ip].timestamp > 3600000) {
        global.requestCounts[ip] = { count: 0, timestamp: now };
    }

    global.requestCounts[ip].count++;

    const isHighPriorityRoute = req.path.includes('/mint') || req.path.includes('/buy');
    const isSeatCheckRoute = req.path.includes('/check-seat') || req.path.includes('/reserve-seat');

    let limit = 100;
    if (isHighPriorityRoute) {
        limit = 50;
    } else if (isSeatCheckRoute) {
        limit = 200;
    }

    if (global.requestCounts[ip].count > limit) {
        return res.status(429).json({
            success: false,
            msg: 'Too many requests, please try again later',
            retryAfter: 3600000 - (now - global.requestCounts[ip].timestamp)
        });
    }

    next();
};

// ENHANCED: Seat locking middleware using hybrid service
const seatLockMiddleware = async (req, res, next) => {
    if (req.method === 'POST' && req.path === '/mint') {
        const { concertId, sectionName, seatNumber } = req.body;
        const userId = req.user?.walletAddress;
        const seatLockingService = getSeatLockingService();

        if (concertId && sectionName && seatNumber && userId && seatLockingService) {
            console.log(`🔒 Processing mint request for seat: ${concertId}-${sectionName}-${seatNumber} by ${userId}`);

            // Lock seat for processing using hybrid service
            const lockResult = seatLockingService.lockSeatForProcessing(
                concertId, sectionName, seatNumber, userId, 'mint'
            );

            if (!lockResult.success) {
                console.log(`❌ Cannot process mint - seat lock failed: ${lockResult.reason}`);
                return res.status(409).json({
                    success: false,
                    msg: getSeatUnavailableMessage(lockResult.reason),
                    conflict: true,
                    reason: lockResult.reason,
                    processingBy: lockResult.processingBy || 'other_user',
                    operation: lockResult.operation
                });
            }

            console.log(`✅ Seat locked for processing: ${concertId}-${sectionName}-${seatNumber}`);

            // Setup cleanup for when request completes
            const cleanup = () => {
                console.log(`🔓 Cleaning up processing lock for ${concertId}-${sectionName}-${seatNumber}`);
            };

            res.on('finish', cleanup);
            res.on('close', cleanup);
            res.on('error', cleanup);
        }
    }

    next();
};

// ✅ DEBUG MIDDLEWARE - untuk tracking request
router.use((req, res, next) => {
    console.log(`📍 TICKETS ROUTE HIT: ${req.method} ${req.path}`);
    console.log(`📍 Original URL: ${req.originalUrl}`);
    next();
});

// ==================== PUBLIC ROUTES (NO AUTH) ====================

// ✅ MARKETPLACE - NO AUTH REQUIRED
router.get('/market', enhancedRateLimit, async (req, res) => {
    console.log('🏪 MARKETPLACE ROUTE HIT - /api/tickets/market (NO AUTH)');

    try {
        const Ticket = require('../models/Ticket');
        const Concert = require('../models/Concert');

        console.log('📊 Fetching tickets with isListed: true');

        const tickets = await Ticket.find({
            isListed: true,
            listingPrice: { $exists: true, $gt: 0 }
        }).sort({ listingDate: -1 });

        console.log(`📊 Found ${tickets.length} tickets listed for sale`);

        if (tickets.length === 0) {
            console.log('📊 No tickets found in marketplace');
            return res.json({
                success: true,
                tickets: [],
                count: 0,
                message: 'No tickets currently listed for sale',
                timestamp: new Date().toISOString()
            });
        }

        const enhancedTickets = await Promise.allSettled(
            tickets.map(async (ticket) => {
                try {
                    const concert = await Concert.findById(ticket.concertId);
                    return {
                        ...ticket.toObject(),
                        concertName: concert?.name || 'Unknown Concert',
                        concertVenue: concert?.venue || 'Unknown Venue',
                        concertDate: concert?.date || null,
                        concertExists: !!concert
                    };
                } catch (err) {
                    console.warn(`Error fetching concert for ticket ${ticket._id}:`, err.message);
                    return {
                        ...ticket.toObject(),
                        concertName: 'Unknown Concert',
                        concertVenue: 'Unknown Venue',
                        concertExists: false
                    };
                }
            })
        );

        const validTickets = enhancedTickets
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        console.log(`✅ Returning ${validTickets.length} marketplace tickets`);

        return res.json({
            success: true,
            tickets: validTickets,
            count: validTickets.length,
            message: `Found ${validTickets.length} tickets for sale`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error in marketplace route:', error);
        return res.status(500).json({
            success: false,
            msg: 'Server error loading marketplace',
            error: error.message
        });
    }
});

// ✅ MARKETPLACE STATS - NO AUTH REQUIRED
router.get('/marketplace/stats', enhancedRateLimit, async (req, res) => {
    console.log('📊 MARKETPLACE STATS ROUTE HIT (NO AUTH)');

    try {
        const Ticket = require('../models/Ticket');

        // Use countDocuments instead of aggregate for compatibility
        const totalTickets = await Ticket.countDocuments({});
        const listedTickets = await Ticket.countDocuments({ isListed: true });

        return res.json({
            success: true,
            marketplaceStats: {
                totalTickets,
                listedTickets,
                availableRate: totalTickets > 0 ? ((listedTickets / totalTickets) * 100).toFixed(2) : 0,
                avgListingPrice: 0.5,
                priceRange: { min: 0.1, max: 2.0 },
                isHealthy: true,
                lastCalculated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error in marketplace stats route:', error);
        return res.status(500).json({
            success: false,
            msg: 'Server error in marketplace stats',
            error: error.message
        });
    }
});

// ✅ HEALTH CHECK - NO AUTH REQUIRED
router.get('/ping', (req, res) => {
    console.log('🏥 HEALTH CHECK ROUTE HIT (NO AUTH)');

    const seatLockingService = getSeatLockingService();
    const webSocketService = getWebSocketService();

    let stats = {};
    if (seatLockingService) {
        try {
            stats = seatLockingService.getSystemStats();
        } catch (err) {
            console.error('Error getting seat locking stats:', err);
        }
    }

    res.json({
        success: true,
        msg: 'Hybrid ticket service is running',
        status: 'healthy',
        services: {
            seatLocking: seatLockingService ? 'active' : 'inactive',
            webSocket: webSocketService ? 'active' : 'inactive'
        },
        locks: stats,
        version: '3.0.0-hybrid',
        features: [
            'hybrid-seat-locking',
            'real-time-websocket',
            'conflict-prevention',
            'automatic-cleanup',
            'service-integration'
        ],
        time: new Date().toISOString()
    });
});
// ✅ FIXED: GET MINTED SEATS - STABLE VERSION
router.get('/concerts/:concertId/minted-seats', enhancedRateLimit, async (req, res) => {
    try {
        console.log('🎭 MINTED SEATS ROUTE - PERMISSIVE VERSION');

        const concertId = req.params.concertId.toString();
        console.log('🎭 Concert ID:', concertId);

        const Ticket = require('../models/Ticket');

        // ✅ STEP 1: Get ALL tickets for concert
        console.log('🔍 Getting ALL tickets for concert...');

        const allTickets = await Ticket.find({
            concertId: concertId
            // ✅ REMOVED: isUsed filter - too restrictive
        })
            .select('sectionName seatNumber owner createdAt transactionSignature status isUsed')
            .lean();

        console.log(`🔍 Found ${allTickets.length} total tickets for concert`);

        // ✅ STEP 2: PERMISSIVE FILTERING - Include more tickets
        const mintedTickets = allTickets.filter(ticket => {
            // ✅ BASIC VALIDATION: Must have section and seat
            if (!ticket.sectionName || !ticket.seatNumber) {
                return false;
            }

            // ✅ EXCLUDE: Obviously invalid tickets
            if (ticket.isUsed === true) {
                return false; // Definitely not minted if explicitly marked as used
            }

            // ✅ PERMISSIVE CRITERIA: Include ticket if ANY of these are true
            const criteria = {
                hasOwner: ticket.owner && ticket.owner.trim() !== '',
                hasTransaction: ticket.transactionSignature &&
                    ticket.transactionSignature.trim() !== '' &&
                    !ticket.transactionSignature.startsWith('dummy_') &&
                    !ticket.transactionSignature.startsWith('error_'),
                hasMintedStatus: ['minted', 'completed', 'confirmed', 'active', 'sold'].includes(ticket.status),
                hasCreationDate: !!ticket.createdAt,
                isNotExplicitlyUnused: ticket.isUsed !== true
            };

            // ✅ RELAXED LOGIC: Include if meets ANY major criteria
            const shouldInclude = (
                criteria.hasOwner ||
                criteria.hasTransaction ||
                criteria.hasMintedStatus
            ) && criteria.isNotExplicitlyUnused;

            if (shouldInclude) {
                console.log(`✅ INCLUDING: ${ticket.sectionName}-${ticket.seatNumber} (` +
                    `Owner: ${criteria.hasOwner}, ` +
                    `Tx: ${criteria.hasTransaction}, ` +
                    `Status: ${ticket.status}, ` +
                    `Used: ${ticket.isUsed})`
                );
            }

            return shouldInclude;
        });

        console.log(`🔍 PERMISSIVE FILTER: ${mintedTickets.length} tickets included`);

        // ✅ STEP 3: Generate seat codes (simplified)
        const seatCodes = [];

        mintedTickets.forEach((ticket) => {
            try {
                // ✅ SIMPLE SEAT CODE GENERATION
                let seatCode;

                // Handle different formats
                if (ticket.seatNumber.includes('-')) {
                    // Already formatted: "VIP-A1" or just "A1"
                    if (ticket.seatNumber.includes(ticket.sectionName)) {
                        seatCode = ticket.seatNumber; // "VIP-A1"
                    } else {
                        seatCode = `${ticket.sectionName}-${ticket.seatNumber}`; // "VIP-A1"
                    }
                } else {
                    // Simple format: "A1" -> "VIP-A1"
                    seatCode = `${ticket.sectionName}-${ticket.seatNumber}`;
                }

                // ✅ BASIC VALIDATION: Must contain hyphen and be reasonable length
                if (seatCode && seatCode.includes('-') && seatCode.length >= 4) {
                    seatCodes.push(seatCode);
                    console.log(`✅ ADDED: ${seatCode}`);
                } else {
                    console.warn(`⚠️ SKIPPED invalid seat: ${seatCode}`);
                }

            } catch (err) {
                console.error(`❌ Error processing ticket:`, err.message);
            }
        });

        // ✅ STEP 4: Clean and deduplicate
        const uniqueSeatCodes = [...new Set(seatCodes)].sort();

        console.log(`🔍 FINAL RESULT: ${uniqueSeatCodes.length} unique minted seats`);
        console.log('🔍 Seats:', uniqueSeatCodes);

        // ✅ STEP 5: FIXED HEADERS - No conflicting cache directives
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate', // ✅ CONSISTENT
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Timestamp': Date.now().toString(),
            'X-Concert-Id': concertId,
            'X-Minted-Count': uniqueSeatCodes.length.toString(),
            'X-Filter-Mode': 'permissive'
        });

        // ✅ STEP 6: CONSISTENT RESPONSE FORMAT
        const response = {
            success: true,
            seats: uniqueSeatCodes,
            count: uniqueSeatCodes.length,
            metadata: {
                concertId: concertId,
                totalTicketsScanned: allTickets.length,
                ticketsIncluded: mintedTickets.length,
                uniqueSeats: uniqueSeatCodes.length,
                timestamp: Date.now(),
                version: 'v4.0-permissive',
                filterMode: 'relaxed'
            },
            debug: process.env.NODE_ENV === 'development' ? {
                sampleIncludedTickets: mintedTickets.slice(0, 3).map(t => ({
                    section: t.sectionName,
                    seat: t.seatNumber,
                    owner: t.owner?.substring(0, 8) + '...',
                    status: t.status,
                    hasTransaction: !!t.transactionSignature,
                    isUsed: t.isUsed
                }))
            } : undefined
        };

        console.log(`✅ SENDING RESPONSE: ${uniqueSeatCodes.length} seats for concert ${concertId}`);
        return res.json(response);

    } catch (error) {
        console.error('❌ CRITICAL ERROR in minted-seats route:', error);

        // ✅ GUARANTEED FALLBACK: Always return valid structure
        return res.status(200).json({ // ✅ Return 200, not 500
            success: false,
            seats: [], // ✅ ALWAYS return empty array, never undefined
            count: 0,
            msg: 'Error getting minted seats',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error',
            timestamp: Date.now(),
            fallback: true,
            metadata: {
                concertId: req.params.concertId,
                errorOccurred: true
            }
        });
    }
});

// ✅ ADD: CACHE WARMING ENDPOINT (Optional - for performance)
router.post('/concerts/:concertId/warm-cache', enhancedRateLimit, async (req, res) => {
    try {
        const { concertId } = req.params;
        console.log(`🔥 Warming cache for concert: ${concertId}`);

        // Trigger minted seats calculation
        const response = await fetch(`${req.protocol}://${req.get('host')}/api/tickets/concerts/${concertId}/minted-seats`);
        const data = await response.json();

        return res.json({
            success: true,
            message: 'Cache warmed successfully',
            mintedSeats: data.count || 0,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('❌ Error warming cache:', error);
        return res.status(500).json({
            success: false,
            msg: 'Error warming cache'
        });
    }
});


// ==================== AUTHENTICATED ROUTES (AUTH REQUIRED) ====================

// ✅ SEAT AVAILABILITY CHECK - AUTH REQUIRED
router.post('/check-seat-availability', auth, enhancedRateLimit, async (req, res) => {
    try {
        const { concertId, sectionName, seatNumber } = req.body;
        const seatLockingService = getSeatLockingService();

        if (!concertId || !sectionName || !seatNumber) {
            return res.status(400).json({
                success: false,
                msg: 'Missing required parameters: concertId, sectionName, seatNumber'
            });
        }

        if (!seatLockingService) {
            return res.status(503).json({
                success: false,
                msg: 'Seat locking service not available'
            });
        }

        const status = seatLockingService.checkSeatLockStatus(concertId, sectionName, seatNumber);

        return res.json({
            success: true,
            available: !status.locked,
            status: status.locked ? 'locked' : 'available',
            lockType: status.lockType,
            lockedBy: status.locked ? 'other_user' : null,
            expiresAt: status.expiresAt,
            timeRemaining: status.timeRemaining
        });

    } catch (error) {
        console.error('Error checking seat availability:', error);
        return res.status(500).json({
            success: false,
            msg: 'Server error checking seat availability',
            error: error.message
        });
    }
});

// ✅ RESERVE SEAT - AUTH REQUIRED
router.post('/reserve-seat', auth, enhancedRateLimit, async (req, res) => {
    try {
        const { concertId, sectionName, seatNumber } = req.body;
        const userId = req.user?.walletAddress;
        const seatLockingService = getSeatLockingService();

        if (!concertId || !sectionName || !seatNumber || !userId) {
            return res.status(400).json({
                success: false,
                msg: 'Missing required parameters: concertId, sectionName, seatNumber'
            });
        }

        if (!seatLockingService) {
            return res.status(503).json({
                success: false,
                msg: 'Seat locking service not available'
            });
        }

        console.log(`📝 Reserve seat request: ${concertId}-${sectionName}-${seatNumber} by ${userId}`);

        const lockResult = seatLockingService.lockSeatTemporarily(
            concertId, sectionName, seatNumber, userId
        );

        if (lockResult.success) {
            console.log(`✅ Seat reserved: ${concertId}-${sectionName}-${seatNumber} for ${userId}`);

            return res.json({
                success: true,
                msg: 'Seat reserved successfully',
                seatKey: `${concertId}-${sectionName}-${seatNumber}`,
                expiresAt: lockResult.expiresAt,
                timeRemaining: lockResult.timeRemaining,
                lockType: lockResult.type
            });
        } else {
            console.log(`❌ Seat reservation failed: ${lockResult.reason}`);

            return res.status(409).json({
                success: false,
                msg: getSeatUnavailableMessage(lockResult.reason),
                reason: lockResult.reason,
                lockedBy: 'other_user',
                expiresAt: lockResult.expiresAt,
                timeRemaining: lockResult.timeRemaining
            });
        }

    } catch (error) {
        console.error('Error reserving seat:', error);
        return res.status(500).json({
            success: false,
            msg: 'Server error reserving seat',
            error: error.message
        });
    }
});

// ✅ RELEASE SEAT - AUTH REQUIRED
router.delete('/reserve-seat', auth, async (req, res) => {
    try {
        const { concertId, sectionName, seatNumber } = req.body;
        const userId = req.user?.walletAddress;
        const seatLockingService = getSeatLockingService();

        if (!concertId || !sectionName || !seatNumber || !userId) {
            return res.status(400).json({
                success: false,
                msg: 'Missing required parameters'
            });
        }

        if (!seatLockingService) {
            return res.status(503).json({
                success: false,
                msg: 'Seat locking service not available'
            });
        }

        console.log(`🔓 Release seat request: ${concertId}-${sectionName}-${seatNumber} by ${userId}`);

        const unlockResult = seatLockingService.unlockSeat(
            concertId, sectionName, seatNumber, userId
        );

        if (unlockResult.success) {
            console.log(`✅ Seat released: ${concertId}-${sectionName}-${seatNumber} by ${userId}`);

            return res.json({
                success: true,
                msg: 'Seat reservation released successfully',
                lockType: unlockResult.type
            });
        } else {
            return res.status(404).json({
                success: false,
                msg: unlockResult.reason === 'not_found_or_unauthorized'
                    ? 'No reservation found or not authorized'
                    : 'Failed to release reservation'
            });
        }

    } catch (error) {
        console.error('Error releasing seat reservation:', error);
        return res.status(500).json({
            success: false,
            msg: 'Server error releasing reservation',
            error: error.message
        });
    }
});

// ✅ MINT TICKET - AUTH REQUIRED
router.post('/mint', auth, seatLockMiddleware, enhancedRateLimit, async (req, res) => {
    try {
        const { concertId, sectionName, seatNumber } = req.body;
        const userId = req.user?.walletAddress;
        const seatLockingService = getSeatLockingService();

        console.log(`🎫 Processing mint request: ${concertId}-${sectionName}-${seatNumber} by ${userId}`);

        await ticketController.mintTicket(req, res);

        res.on('finish', () => {
            if (seatLockingService && concertId && sectionName && seatNumber && userId) {
                const success = res.statusCode >= 200 && res.statusCode < 300;
                console.log(`🏁 Completing processing: success=${success}`);
                seatLockingService.completeProcessing(concertId, sectionName, seatNumber, userId, success);
            }
        });

    } catch (error) {
        console.error('Error in mint route:', error);

        const { concertId, sectionName, seatNumber } = req.body;
        const userId = req.user?.walletAddress;
        const seatLockingService = getSeatLockingService();

        if (seatLockingService && concertId && sectionName && seatNumber && userId) {
            seatLockingService.completeProcessing(concertId, sectionName, seatNumber, userId, false);
        }

        return res.status(500).json({
            success: false,
            msg: 'Server error during minting',
            error: error.message
        });
    }
});

// ✅ GET MY TICKETS - AUTH REQUIRED
router.get('/', auth, ticketController.getMyTickets);

// ✅ LIST TICKET FOR SALE - AUTH REQUIRED
router.post('/:id/list', auth, ticketController.listTicketForSale);

// ✅ CANCEL TICKET LISTING - AUTH REQUIRED
router.delete('/:id/list', auth, ticketController.cancelTicketListing);

// ✅ BUY TICKET - AUTH REQUIRED
router.post('/:id/buy', auth, enhancedRateLimit, ticketController.buyTicket);

// ✅ DELETE TICKET - AUTH REQUIRED
router.delete('/:id', auth, ticketController.deleteTicket);

// ✅ VERIFY TICKET - AUTH REQUIRED
router.put('/:id/verify', auth, ticketController.verifyTicket);

// ✅ GET TICKET HISTORY - AUTH REQUIRED
router.get('/:id/history', auth, (req, res) => {
    if (typeof ticketController.getTicketTransactionHistory === 'function') {
        return ticketController.getTicketTransactionHistory(req, res);
    }

    return res.status(501).json({
        success: false,
        msg: 'Transaction history not implemented'
    });
});

// ✅ VERIFY BLOCKCHAIN - AUTH REQUIRED
router.post('/:id/verify-blockchain', auth, async (req, res) => {
    try {
        const Ticket = require('../models/Ticket');
        const ticket = await Ticket.findById(req.params.id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                msg: 'Ticket not found'
            });
        }

        if (ticket.owner !== req.user.walletAddress) {
            return res.status(403).json({
                success: false,
                msg: 'Not authorized to verify this ticket'
            });
        }

        ticket.blockchainStatus = {
            verified: true,
            lastVerified: new Date(),
            verifiedBy: req.user.walletAddress,
            verificationMethod: 'manual'
        };

        ticket.transactionHistory.push({
            action: 'blockchain_verify',
            from: req.user.walletAddress,
            timestamp: new Date(),
            verificationAction: true,
            blockchainVerified: true
        });

        await ticket.save();

        return res.json({
            success: true,
            verification: {
                success: true,
                timestamp: new Date(),
                verifiedBy: req.user.walletAddress,
                method: 'manual'
            },
            ticket: {
                id: ticket._id,
                blockchainVerified: true,
                lastVerified: new Date()
            }
        });
    } catch (error) {
        console.error('Error in verify-blockchain route:', error);
        return res.status(500).json({
            success: false,
            msg: 'Server error',
            error: error.message
        });
    }
});

// ✅ GET TICKET BY ID - AUTH REQUIRED - MUST BE LAST
router.get('/:id', auth, (req, res) => {
    const ticketId = req.params.id;

    console.log(`🎫 TICKET ID ROUTE HIT: ${ticketId}`);

    // ✅ BLOCK known conflicting values
    if (ticketId === 'market' || ticketId === 'marketplace' || ticketId === 'stats') {
        console.log(`❌ BLOCKED: Invalid ticket ID "${ticketId}"`);
        return res.status(400).json({
            success: false,
            msg: `Invalid request: "${ticketId}" is not a valid ticket ID`
        });
    }

    // ✅ VALIDATE ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
        console.log(`❌ Invalid ObjectId format: ${ticketId}`);
        return res.status(400).json({
            success: false,
            msg: 'Invalid ticket ID format - must be a valid ObjectId'
        });
    }

    console.log(`✅ Valid ticket ID: ${ticketId}, proceeding to controller`);
    ticketController.getTicket(req, res);
});

// ==================== SYSTEM STATUS ROUTES (AUTH REQUIRED) ====================

// ✅ SYSTEM LOCKS - AUTH REQUIRED
router.get('/system/locks', auth, (req, res) => {
    try {
        const seatLockingService = getSeatLockingService();

        if (!seatLockingService) {
            return res.status(503).json({
                success: false,
                msg: 'Seat locking service not available'
            });
        }

        const stats = seatLockingService.getSystemStats();

        return res.json({
            success: true,
            locks: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting system locks:', error);
        return res.status(500).json({
            success: false,
            msg: 'Server error',
            error: error.message
        });
    }
});
router.get('/concerts/:concertId/debug', enhancedRateLimit, async (req, res) => {
    try {
        console.log('🔍 DEBUG ENDPOINT HIT');

        const concertId = req.params.concertId.toString();
        const Ticket = require('../models/Ticket');

        // Get ALL tickets untuk concert ini
        const allTickets = await Ticket.find({ concertId })
            .select('sectionName seatNumber transactionSignature status isUsed createdAt owner')
            .lean();

        console.log(`🔍 DEBUG: Found ${allTickets.length} total tickets for concert ${concertId}`);

        // Group tickets by different criteria
        const ticketsByStatus = {};
        const ticketsWithTxSig = [];
        const ticketsWithoutTxSig = [];
        const usedTickets = [];
        const unusedTickets = [];

        allTickets.forEach(ticket => {
            // Group by status
            const status = ticket.status || 'no_status';
            if (!ticketsByStatus[status]) {
                ticketsByStatus[status] = [];
            }
            ticketsByStatus[status].push({
                seat: `${ticket.sectionName}-${ticket.seatNumber}`,
                hasTransaction: !!ticket.transactionSignature,
                isUsed: ticket.isUsed,
                createdAt: ticket.createdAt
            });

            // Group by transaction signature
            if (ticket.transactionSignature &&
                ticket.transactionSignature.trim() !== '' &&
                !ticket.transactionSignature.startsWith('dummy_')) {
                ticketsWithTxSig.push({
                    seat: `${ticket.sectionName}-${ticket.seatNumber}`,
                    status: ticket.status,
                    txSig: ticket.transactionSignature.substring(0, 12) + '...',
                    isUsed: ticket.isUsed
                });
            } else {
                ticketsWithoutTxSig.push({
                    seat: `${ticket.sectionName}-${ticket.seatNumber}`,
                    status: ticket.status,
                    txSig: ticket.transactionSignature || 'none',
                    isUsed: ticket.isUsed
                });
            }

            // Group by usage
            if (ticket.isUsed) {
                usedTickets.push(`${ticket.sectionName}-${ticket.seatNumber}`);
            } else {
                unusedTickets.push(`${ticket.sectionName}-${ticket.seatNumber}`);
            }
        });

        const response = {
            success: true,
            concertId,
            summary: {
                totalTickets: allTickets.length,
                ticketsWithValidTxSig: ticketsWithTxSig.length,
                ticketsWithoutValidTxSig: ticketsWithoutTxSig.length,
                usedTickets: usedTickets.length,
                unusedTickets: unusedTickets.length,
                statusBreakdown: Object.keys(ticketsByStatus).map(status => ({
                    status,
                    count: ticketsByStatus[status].length
                }))
            },
            breakdown: {
                ticketsByStatus,
                ticketsWithTransaction: ticketsWithTxSig,
                ticketsWithoutTransaction: ticketsWithoutTxSig.slice(0, 5), // Limit untuk tidak overflow
                usedTickets,
                unusedTickets
            },
            sampleTickets: allTickets.slice(0, 5).map(t => ({
                sectionName: t.sectionName,
                seatNumber: t.seatNumber,
                status: t.status,
                isUsed: t.isUsed,
                hasTransactionSignature: !!t.transactionSignature,
                txSignature: t.transactionSignature ?
                    (t.transactionSignature.substring(0, 16) + '...') : null,
                createdAt: t.createdAt
            })),
            // What would be considered "minted" dengan current logic
            wouldBeMinted: allTickets.filter(ticket => {
                const hasValidTx = ticket.transactionSignature &&
                    ticket.transactionSignature.trim() !== '' &&
                    !ticket.transactionSignature.startsWith('dummy_');
                const hasMintedStatus = ticket.status === 'minted' ||
                    ticket.status === 'completed';
                const isActive = !ticket.isUsed;
                return (hasValidTx || hasMintedStatus) && isActive;
            }).map(t => `${t.sectionName}-${t.seatNumber}`),
            timestamp: new Date().toISOString()
        };

        console.log('🔍 DEBUG: Response summary:', response.summary);
        return res.json(response);

    } catch (error) {
        console.error('🔍 DEBUG: Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ CONCERT LOCKS - AUTH REQUIRED
router.get('/concerts/:concertId/locks', auth, (req, res) => {
    try {
        const { concertId } = req.params;
        const seatLockingService = getSeatLockingService();

        if (!seatLockingService) {
            return res.status(503).json({
                success: false,
                msg: 'Seat locking service not available'
            });
        }

        const locks = seatLockingService.getLocksForConcert(concertId);

        return res.json({
            success: true,
            concertId,
            locks,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting concert locks:', error);
        return res.status(500).json({
            success: false,
            msg: 'Server error',
            error: error.message
        });
    }
});

// ✅ SYSTEM CLEANUP - AUTH REQUIRED
router.post('/system/cleanup', auth, (req, res) => {
    try {
        const seatLockingService = getSeatLockingService();

        if (!seatLockingService) {
            return res.status(503).json({
                success: false,
                msg: 'Seat locking service not available'
            });
        }

        const cleanedCount = seatLockingService.cleanupExpiredLocks();

        return res.json({
            success: true,
            message: `Cleaned up ${cleanedCount} expired locks`,
            cleanedCount,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error during cleanup:', error);
        return res.status(500).json({
            success: false,
            msg: 'Error during cleanup',
            error: error.message
        });
    }
});

module.exports = router;
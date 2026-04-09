const mongoose = require('mongoose');
const { VALID_MATCH_TYPES, MATCH_TYPE_SLOTS } = require('../utils/matchTypes');

const tournamentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a tournament title'],
            trim: true,
            minlength: [3, 'Title must be at least 3 characters'],
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        description: {
            type: String,
            required: [true, 'Please provide a tournament description'],
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        game: {
            type: String,
            required: [true, 'Please specify the game'],
            trim: true,
            enum: ['PUBG Mobile', 'Free Fire', 'Call of Duty Mobile', 'Valorant', 'CS:GO', 'Other'],
        },
        platform: {
            type: String,
            required: [true, 'Please specify the platform'],
            enum: ['Mobile', 'PC', 'Console', 'Cross-Platform'],
        },
        // ── Match type — drives auto-slot configuration ─────────────────────
        // When set, maxParticipants is auto-derived via the pre-validate hook.
        // Optional for backward compatibility with existing tournaments.
        matchType: {
            type: String,
            enum: [...VALID_MATCH_TYPES],
            default: null,
        },
        startDate: {
            type: Date,
            required: [true, 'Please provide a start date'],
        },
        endDate: {
            type: Date,
            required: [true, 'Please provide an end date'],
            validate: {
                validator: function (value) {
                    return value > this.startDate;
                },
                message: 'End date must be after start date',
            },
        },
        registrationDeadline: {
            type: Date,
            required: [true, 'Please provide a registration deadline'],
            validate: {
                validator: function (value) {
                    return value < this.startDate;
                },
                message: 'Registration deadline must be before start date',
            },
        },
        maxParticipants: {
            type: Number,
            required: [true, 'Please specify maximum participants'],
            min: [2, 'Must have at least 2 participants'],
            max: [1000, 'Cannot exceed 1000 participants'],
        },
        entryFee: {
            type: Number,
            required: [true, 'Please specify entry fee'],
            min: [0, 'Entry fee cannot be negative'],
            default: 0,
        },
        prizePool: {
            type: Number,
            required: [true, 'Please specify prize pool'],
            min: [0, 'Prize pool cannot be negative'],
        },
        prizeDistribution: {
            type: Map,
            of: Number,
            default: new Map([
                ['1st', 50],
                ['2nd', 30],
                ['3rd', 20],
            ]),
        },
        rules: {
            type: String,
            trim: true,
            maxlength: [2000, 'Rules cannot exceed 2000 characters'],
        },
        status: {
            type: String,
            enum: ['draft', 'upcoming', 'live', 'completed', 'cancelled'],
            default: 'draft',
            required: true,
        },
        participants: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                paymentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Payment',
                },
                registeredAt: {
                    type: Date,
                    default: Date.now,
                },
                status: {
                    type: String,
                    enum: ['registered', 'confirmed', 'cancelled', 'banned'],
                    default: 'registered',
                },
                rank: {
                    type: Number,
                    min: 1,
                },
                score: {
                    type: Number,
                    default: 0,
                },
                // Team registration data — optional, collected during registration
                assignedSlot: {
                    type: Number,
                    min: 1,
                },
                teamLeaderName: {
                    type: String,
                    trim: true,
                    maxlength: 100,
                },
                leaderGameName: {
                    type: String,
                    trim: true,
                    maxlength: 100,
                },
                teamMember2: {
                    type: String,
                    trim: true,
                    maxlength: 100,
                },
                teamMember3: {
                    type: String,
                    trim: true,
                    maxlength: 100,
                },
                teamMember4: {
                    type: String,
                    trim: true,
                    maxlength: 100,
                },
                // Ban metadata — populated only when status === 'banned'
                bannedAt: { type: Date },
                bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                banReason: { type: String, trim: true, maxlength: 500 },
                refunded: { type: Boolean, default: false },
                // Winnings metadata — populated when winnings are distributed
                winningAmount: { type: Number, default: 0 },
                winsDistributedAt: { type: Date, default: null },
            },
        ],
        bannerImage: {
            type: String,
            trim: true,
        },
        // Room credentials — stored but NEVER returned unless explicitly selected.
        // select:false ensures they are invisible to all generic queries.
        roomId: {
            type: String,
            trim: true,
            default: null,
            select: false,
        },
        roomPassword: {
            type: String,
            trim: true,
            default: null,
            select: false,
        },
        // ─── Winnings distribution ────────────────────────────────────────────
        // winningsDistributed is the first-layer double-distribution guard.
        // It is set atomically (findOneAndUpdate with condition: false) before
        // any wallet credit fires. If already true → 409 immediately.
        winningsDistributed: {
            type: Boolean,
            default: false,
            index: true,
        },
        distributedAt: {
            type: Date,
            default: null,
        },
        distributedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
tournamentSchema.index({ status: 1, startDate: -1 });
tournamentSchema.index({ game: 1 });
tournamentSchema.index({ isDeleted: 1 });
tournamentSchema.index({ createdAt: -1 });

// Multikey index for participant lookups — speeds up $elemMatch queries in getPublicTournaments
// and the registration check in getRoomDetails / getMyRegistrationStatus.
tournamentSchema.index({ 'participants.userId': 1, 'participants.status': 1 });

// Compound index for leaderboard aggregation — covers the $match stage
tournamentSchema.index({ winningsDistributed: 1, isDeleted: 1, distributedAt: -1 });

// Virtual for participant count
tournamentSchema.virtual('participantCount').get(function () {
    return this.participants.filter(p => p.status !== 'cancelled').length;
});

// Virtual for available slots
tournamentSchema.virtual('availableSlots').get(function () {
    return this.maxParticipants - this.participantCount;
});

// Method to check if registration is open
tournamentSchema.methods.isRegistrationOpen = function () {
    const now = new Date();
    return (
        this.status === 'upcoming' &&
        now < this.registrationDeadline &&
        this.participantCount < this.maxParticipants
    );
};

// Method to add participant
tournamentSchema.methods.addParticipant = function (userId) {
    if (!this.isRegistrationOpen()) {
        throw new Error('Registration is closed');
    }

    const alreadyRegistered = this.participants.some(
        p => p.userId.toString() === userId.toString() && p.status !== 'cancelled'
    );

    if (alreadyRegistered) {
        throw new Error('User already registered');
    }

    this.participants.push({ userId });
    return this.save();
};

// ── Pre-validate hook: auto-set maxParticipants from matchType ────────────────
// When matchType is provided, the slot count is derived from the constants table.
// This ensures the backend is ALWAYS the authority — even if the frontend sends
// a conflicting maxParticipants value, it gets overridden here.
// NOTE: Mongoose 9 uses promise-based middleware — no `next` callback.
tournamentSchema.pre('validate', function () {
    if (this.matchType && MATCH_TYPE_SLOTS[this.matchType] !== undefined) {
        this.maxParticipants = MATCH_TYPE_SLOTS[this.matchType];
    }
});

module.exports = mongoose.model('Tournament', tournamentSchema);

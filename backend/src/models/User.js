const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  DRIP_QUADRANTS,
  ONBOARDING_STEPS,
  ROLES,
  HANDOFF_STATUSES,
  HANDOFF_METHODS,
  FILL_TIMES,
} = require('../utils/buyback');

// One activity from the user's typical day, placed on the DRIP Matrix.
const activitySchema = new mongoose.Schema(
  {
    activity: { type: String, required: true, trim: true, maxlength: 60 },
    hours: { type: Number, required: true, min: 0.25, max: 24 },
    value: { type: String, enum: ['high', 'low'], required: true },
    // $ to $$$$$ (1-5); sets value ($$$ and up = high). Empty for days audited before the $ rating.
    money: { type: Number, min: 1, max: 5, default: null },
    // How the time was entered: 'day', or 'week' for weekly tasks (hours is always per workday).
    per: { type: String, enum: ['day', 'week'], default: 'day' },
    // Empty until the user swipes the activity.
    energy: { type: String, enum: ['energizing', 'draining', null], default: null },
    quadrant: { type: String, enum: [...DRIP_QUADRANTS, null], default: null },
  },
  { _id: false }
);

const onboardingSchema = new mongoose.Schema(
  {
    currentStep: { type: String, enum: ONBOARDING_STEPS, default: 'profile' },
    completed: { type: Boolean, default: false },
    completedAt: Date,

    // What best describes the user; picks their starting day template
    role: { type: String, enum: ROLES },

    // Buyback Rate (chapter 2)
    annualIncome: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', maxlength: 3 },
    effectiveHourlyRate: Number,
    buybackRate: Number,

    // Typical day in the user's own words, then sorted into the DRIP Matrix (chapter 2)
    dayDescription: { type: String, trim: true, maxlength: 2000 },
    schedule: { type: [activitySchema], default: [] },
  },
  { _id: false }
);

// Progress on handing off one draining activity, keyed by the activity's name in the schedule.
const handoffSchema = new mongoose.Schema(
  {
    activity: { type: String, required: true, trim: true, maxlength: 60 },
    status: { type: String, enum: HANDOFF_STATUSES, default: 'mine' },
    // The chosen way to buy it back (one of the app's suggestions), and its kind.
    plan: { type: String, trim: true, maxlength: 140, default: '' },
    method: { type: String, enum: [...HANDOFF_METHODS, null], default: null },
    who: { type: String, trim: true, maxlength: 60, default: '' },
    // The handoff checklist: what a good result looks like, the playbook steps, and when it starts.
    doneLooksLike: { type: String, trim: true, maxlength: 200, default: '' },
    playbook: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
    startDate: Date,
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    doneAt: Date,
  },
  { _id: false }
);

// Fill (the last step of the Buyback Loop): freed hours given to energizing work.
// Kept apart from the audited day until the next round's re-audit folds them in.
const fillSchema = new mongoose.Schema(
  {
    activity: { type: String, required: true, trim: true, maxlength: 60 },
    hours: { type: Number, required: true, min: 0.25, max: 24 },
    quadrant: { type: String, enum: ['production', 'investment'], required: true },
    when: { type: String, enum: [...FILL_TIMES, null], default: null },
  },
  { _id: false }
);

// One finished lap of the Buyback Loop (Audit → Transfer → Fill), kept for lifetime totals.
const roundSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now },
    boughtBackHours: { type: Number, default: 0 }, // a day
    filledHours: { type: Number, default: 0 }, // a day
    handedOff: { type: [String], default: [] },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // Guests start using the app right away; name, email and password come later if they sign up.
    isGuest: { type: Boolean, default: false },
    name: { type: String, trim: true, maxlength: 80 },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: { type: String, minlength: 8, select: false },
    onboarding: { type: onboardingSchema, default: () => ({}) },
    handoffs: { type: [handoffSchema], default: [] },
    fills: { type: [fillSchema], default: [] },
    rounds: { type: [roundSchema], default: [] },
  },
  { timestamps: true }
);

// Unique only among users who have an email, so any number of guests can exist.
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);

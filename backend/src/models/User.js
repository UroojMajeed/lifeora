const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  DRIP_QUADRANTS,
  ONBOARDING_STEPS,
  ROLES,
  HANDOFF_STATUSES,
  HANDOFF_METHODS,
  HANDOFF_STEP_KINDS, SETTLE_ANSWERS,
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

// One step of a handoff plan. `kind` is what the step is (the app's helpers for it), `title` the
// user's own name for it; a step counts as done when the user says so ("I did it").
const handoffStepSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true, maxlength: 24 },
    kind: { type: String, enum: HANDOFF_STEP_KINDS, required: true },
    title: { type: String, required: true, trim: true, maxlength: 40 },
    done: { type: Boolean, default: false },
    doneAt: Date,
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
    // 10-80-10: you set what done looks like (first 10%) and how you'll check it (last 10%); they own the 80% between.
    checkHow: { type: String, trim: true, maxlength: 200, default: '' },
    playbook: { type: [{ type: String, trim: true, maxlength: 120 }], default: [] },
    startDate: Date,
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    // The user's own plan for this handoff (empty: the app's suggested steps), and whether they've confirmed it.
    steps: { type: [handoffStepSchema], default: [] },
    planConfirmed: { type: Boolean, default: false },
    // The settle-in check after the handover: how it was going on day 3 and day 10 ('' until answered).
    settleDay3: { type: String, enum: SETTLE_ANSWERS, default: '' },
    settleDay10: { type: String, enum: SETTLE_ANSWERS, default: '' },
    // When a weekly check-in said it slipped back (cleared once it's handed off again).
    cameBackAt: Date,
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

// One weekly check-in: did each handoff stick, were the reinvested hours used, how the week felt.
const checkInSchema = new mongoose.Schema(
  {
    week: { type: String, required: true }, // the Monday of the week, YYYY-MM-DD
    at: { type: Date, default: Date.now },
    handoffs: {
      type: [{ activity: { type: String, maxlength: 60 }, answer: { type: String, enum: ['kept', 'slipped'] }, _id: false }],
      default: [],
    },
    fills: {
      type: [{ activity: { type: String, maxlength: 60 }, answer: { type: String, enum: ['yes', 'partly', 'no'] }, _id: false }],
      default: [],
    },
    feeling: { type: Number, min: 1, max: 4, default: null },
    confirmedHours: { type: Number, default: 0 }, // hours a week, from the handoffs that stuck
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
    checkIns: { type: [checkInSchema], default: [] },
    // Progress that follows you to a new phone: hours bought back per week (keyed by the week's
    // Monday), the weeks you made a move (the streak), and milestones already celebrated.
    progress: {
      weeks: { type: Map, of: Number, default: () => new Map() },
      activeWeeks: { type: [String], default: [] },
      milestones: { type: Map, of: Date, default: () => new Map() },
    },
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

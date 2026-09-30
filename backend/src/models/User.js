const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { FEELINGS, TIME_ASSASSINS, ONBOARDING_STEPS } = require('../utils/buyback');

const onboardingSchema = new mongoose.Schema(
  {
    currentStep: { type: String, enum: ONBOARDING_STEPS, default: 'buyback_rate' },
    completed: { type: Boolean, default: false },
    completedAt: Date,

    // Buyback Rate (chapter 2)
    annualIncome: { type: Number, min: 0 },
    currency: { type: String, default: 'USD', maxlength: 3 },
    effectiveHourlyRate: Number,
    buybackRate: Number,

    // Delegation Quadrant tasks that drain energy (chapters 2, 4, 6)
    drainingTasks: { type: [String], default: [] },

    // Replacement Ladder position (chapter 5)
    feeling: { type: String, enum: FEELINGS },
    ladderRung: { type: Number, min: 1, max: 5 },

    // 5 Time Assassins (chapter 3)
    timeAssassins: { type: [{ type: String, enum: TIME_ASSASSINS }], default: [] },

    // "What would I fill my time with?" (chapter 1)
    visionStatement: { type: String, maxlength: 1000, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    onboarding: { type: onboardingSchema, default: () => ({}) },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
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

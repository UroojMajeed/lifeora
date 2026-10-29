const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

// Phones stay signed in: a guest's token is their only way back to their data, and a saved
// account shouldn't be signed out every week either.
const signToken = (user) =>
  jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: user.isGuest ? '365d' : process.env.JWT_EXPIRES_IN || '365d',
  });

function validateAccount({ name, email, password }, { nameRequired }) {
  const errors = [];
  if (nameRequired && (!name || !String(name).trim())) errors.push('Name is required');
  if (name && String(name).trim().length > 80) errors.push('Name must be 80 characters or fewer');
  if (!email || !/^\S+@\S+\.\S+$/.test(String(email).trim())) errors.push('A valid email is required');
  if (!password || String(password).length < 8) errors.push('Password must be at least 8 characters');
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
}

async function createGuest(req, res, next) {
  try {
    const user = await User.create({ isGuest: true });
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body || {};
    validateAccount({ name, email, password }, { nameRequired: true });

    const user = await User.create({ name: String(name), email: String(email), password: String(password) });
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
}

// "Save your progress": turns the signed-in guest into a real account. Everything they've done stays.
async function saveAccount(req, res, next) {
  try {
    const { name, email, password } = req.body || {};
    validateAccount({ name, email, password }, { nameRequired: false });

    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');
    if (!user.isGuest) throw new ApiError(400, 'Your progress is already saved to an account');

    user.isGuest = false;
    user.email = String(email).toLowerCase().trim();
    user.password = String(password);
    if (name && String(name).trim()) user.name = String(name).trim();
    await user.save(); // a taken email fails here with 409 (unique index)
    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/auth/me: what the app calls you. Only the name, for now.
async function updateMe(req, res, next) {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name || name.length > 80) throw new ApiError(400, 'Validation failed', ['Name must be 1 to 80 characters']);
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');
    user.name = name;
    await user.save();
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw new ApiError(400, 'Email and password are required');

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user || !(await user.comparePassword(String(password)))) {
      throw new ApiError(401, 'Incorrect email or password');
    }
    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) throw new ApiError(404, 'User not found');
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// Permanently deletes the signed-in account and everything in it ("Start over" / delete account).
async function deleteMe(req, res, next) {
  try {
    const { deletedCount } = await User.deleteOne({ _id: req.userId });
    if (!deletedCount) throw new ApiError(404, 'User not found');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { createGuest, register, saveAccount, login, me, updateMe, deleteMe };

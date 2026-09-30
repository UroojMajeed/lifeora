const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const signToken = (user) =>
  jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body || {};
    const errors = [];
    if (!name || !String(name).trim()) errors.push('Name is required');
    if (!email || !/^\S+@\S+\.\S+$/.test(String(email))) errors.push('A valid email is required');
    if (!password || String(password).length < 8) errors.push('Password must be at least 8 characters');
    if (errors.length) throw new ApiError(400, 'Validation failed', errors);

    const user = await User.create({ name: String(name), email: String(email), password: String(password) });
    res.status(201).json({ token: signToken(user), user });
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

module.exports = { register, login, me };

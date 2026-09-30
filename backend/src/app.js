const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

const origins = (process.env.CLIENT_ORIGIN || '*').split(',').map((o) => o.trim());

app.use(helmet());
app.use(cors({ origin: origins.includes('*') ? true : origins }));
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'reclaim-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

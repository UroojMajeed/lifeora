const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const handoffsRoutes = require('./routes/handoffsRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Behind a hosting proxy (e.g. Render), trust its X-Forwarded-For so rate limits see each real client.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

const origins = (process.env.CLIENT_ORIGIN || '*').split(',').map((o) => o.trim());

app.use(helmet());
app.use(cors({ origin: origins.includes('*') ? true : origins }));
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'lifeora-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/handoffs', handoffsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

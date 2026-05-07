const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const tenderRoutes = require('./routes/tenderRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const officerRoutes = require('./routes/officerRoutes');

const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors({ 
  origin: [
    'http://localhost:5173', 
    'https://tender-ai-2-ln34.onrender.com',
    process.env.FRONTEND_URL
  ], 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'TENDER.AI Backend is running.' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/officers', officerRoutes);

// Error handling middleware
app.use(errorHandler);

module.exports = app;

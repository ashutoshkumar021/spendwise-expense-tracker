const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/budget', require('./routes/budget'));
app.use('/api/income', require('./routes/income'));

// Serve static files from frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist/frontend')));

// Serve frontend for all routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/frontend/index.html'));
});

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'SpendWise API is running 🚀' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'production' ? {} : err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

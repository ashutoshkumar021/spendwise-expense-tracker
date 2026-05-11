const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Income = require('../models/Income');
const mongoose = require('mongoose');

// All routes protected
router.use(auth);

// GET /api/income
router.get('/', async (req, res) => {
  try {
    const { month, year, category, startDate, endDate } = req.query;
    
    const filter = { userId: req.user.userId };
    
    if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59)
      };
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const income = await Income.find(filter).sort({ date: -1 });
    res.json(income);
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({ message: 'Error fetching income' });
  }
});

// POST /api/income
router.post('/', async (req, res) => {
  try {
    const { title, amount, category, date, description, tags } = req.body;
    
    if (!title || amount === undefined || !category) {
      return res.status(400).json({ message: 'Title, amount, and category are required' });
    }
    
    const newIncome = new Income({
      userId: req.user.userId,
      title,
      amount,
      category,
      date: date || new Date(),
      description,
      tags: tags || []
    });
    
    await newIncome.save();
    res.status(201).json(newIncome);
  } catch (error) {
    console.error('Add income error:', error);
    res.status(500).json({ message: 'Error adding income' });
  }
});

// PUT /api/income/:id
router.put('/:id', async (req, res) => {
  try {
    const { title, amount, category, date, description, tags } = req.body;
    
    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { title, amount, category, date, description, tags },
      { new: true, runValidators: true }
    );
    
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }
    
    res.json(income);
  } catch (error) {
    console.error('Update income error:', error);
    res.status(500).json({ message: 'Error updating income' });
  }
});

// DELETE /api/income/:id
router.delete('/:id', async (req, res) => {
  try {
    const income = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }
    
    res.json({ message: 'Income deleted successfully' });
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ message: 'Error deleting income' });
  }
});

// GET /api/income/summary
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    // Current month income
    const currentMonthIncome = await Income.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(req.user.userId),
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalCurrentMonth = currentMonthIncome.reduce((sum, item) => sum + item.total, 0);
    
    // Previous month income
    const prevMonthStart = new Date(currentYear, currentMonth - 2, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59);
    
    const prevMonthIncome = await Income.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(req.user.userId),
          date: { $gte: prevMonthStart, $lte: prevMonthEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const prevMonthTotal = prevMonthIncome.length > 0 ? prevMonthIncome[0].total : 0;
    
    // Monthly totals for chart
    const monthlyTotals = await Income.aggregate([
      {
        $match: {
          userId: mongoose.Types.ObjectId(req.user.userId)
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            year: { $year: '$date' }
          },
          total: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $limit: 6
      }
    ]);
    
    res.json({
      categoryTotals: currentMonthIncome,
      totalCurrentMonth,
      prevMonthTotal,
      monthlyTotals
    });
  } catch (error) {
    console.error('Income summary error:', error);
    res.status(500).json({ message: 'Error fetching income summary' });
  }
});

module.exports = router;

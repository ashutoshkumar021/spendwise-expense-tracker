const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

// All routes protected
router.use(auth);

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Rent', 'Groceries', 'Entertainment', 'Utilities', 'Education', 'Insurance', 'Travel', 'Gifts', 'Subscriptions', 'Savings', 'Other'];

// GET /api/budget/status — must be before other GET routes
router.get('/status', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const statusArray = [];

    for (const category of CATEGORIES) {
      const budget = await Budget.findOne({
        userId: req.user.userId,
        category,
        month: currentMonth,
        year: currentYear,
      });

      // Calculate total spent this month for this category
      const result = await Expense.aggregate([
        {
          $match: {
            userId: mongoose.Types.ObjectId(req.user.userId),
            category,
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const spent = result.length > 0 ? result[0].total : 0;
      const limit = budget ? budget.limitAmount : 0;
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status = 'safe';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= 80) status = 'warning';

      statusArray.push({
        category,
        limit,
        spent,
        percentage,
        status,
      });
    }

    res.json(statusArray);
  } catch (error) {
    console.error('Budget status error:', error);
    res.status(500).json({ message: 'Error fetching budget status' });
  }
});

// GET /api/budget
router.get('/', async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user.userId }).sort({ year: -1, month: -1 });
    res.json(budgets);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ message: 'Error fetching budgets' });
  }
});

// POST /api/budget
router.post('/', async (req, res) => {
  try {
    const { category, limitAmount, month, year } = req.body;

    if (!category || limitAmount === undefined || !month || !year) {
      return res.status(400).json({ message: 'Category, limitAmount, month, and year are required' });
    }

    // Upsert: update if exists, create if not
    const budget = await Budget.findOneAndUpdate(
      {
        userId: req.user.userId,
        category,
        month,
        year,
      },
      {
        userId: req.user.userId,
        category,
        limitAmount,
        month,
        year,
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(budget);
  } catch (error) {
    console.error('Set budget error:', error);
    res.status(500).json({ message: 'Error setting budget' });
  }
});

module.exports = router;

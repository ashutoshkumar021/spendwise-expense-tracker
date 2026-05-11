const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const User = require('../models/User');
const { sendBudgetAlert } = require('../services/emailService');

// All routes protected
router.use(auth);

// GET /api/expenses/summary — must be before /:id route
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Category totals for current month
    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const categoryTotals = await Expense.aggregate([
      {
        $match: {
          userId: require('mongoose').Types.ObjectId(req.user.userId),
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          total: 1,
        },
      },
    ]);

    // Monthly totals for last 6 months
    const sixMonthsAgo = new Date(currentYear, currentMonth - 7, 1);

    const monthlyTotals = await Expense.aggregate([
      {
        $match: {
          userId: require('mongoose').Types.ObjectId(req.user.userId),
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            year: { $year: '$date' },
          },
          total: { $sum: '$amount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          month: {
            $arrayElemAt: [
              ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
              '$_id.month',
            ],
          },
          year: '$_id.year',
          total: 1,
        },
      },
    ]);

    res.json({ categoryTotals, monthlyTotals });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ message: 'Error fetching summary' });
  }
});

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { category, month, year } = req.query;
    const filter = { userId: req.user.userId };

    if (category) filter.category = category;

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { title, amount, category, date, description } = req.body;

    if (!title || amount === undefined || !category) {
      return res.status(400).json({ message: 'Title, amount, and category are required' });
    }

    const expense = await Expense.create({
      userId: req.user.userId,
      title,
      amount,
      category,
      date: date || new Date(),
      description,
    });

    // Check budget alert
    try {
      const now = date ? new Date(date) : new Date();
      const expMonth = now.getMonth() + 1;
      const expYear = now.getFullYear();

      const budget = await Budget.findOne({
        userId: req.user.userId,
        category,
        month: expMonth,
        year: expYear,
      });

      if (budget) {
        const startOfMonth = new Date(expYear, expMonth - 1, 1);
        const endOfMonth = new Date(expYear, expMonth, 0, 23, 59, 59);

        const result = await Expense.aggregate([
          {
            $match: {
              userId: require('mongoose').Types.ObjectId(req.user.userId),
              category,
              date: { $gte: startOfMonth, $lte: endOfMonth },
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        const totalSpent = result.length > 0 ? result[0].total : 0;
        const percentage = (totalSpent / budget.limitAmount) * 100;

        if (percentage >= 80) {
          const user = await User.findById(req.user.userId);
          if (user) {
            sendBudgetAlert(user.email, user.name, category, totalSpent, budget.limitAmount);
          }
        }
      }
    } catch (alertError) {
      console.error('Budget alert error:', alertError);
    }

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Error creating expense' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this expense' });
    }

    const { title, amount, category, date, description } = req.body;
    const updated = await Expense.findByIdAndUpdate(
      req.params.id,
      { title, amount, category, date, description },
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Error updating expense' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this expense' });
    }

    await expense.remove();
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Error deleting expense' });
  }
});

module.exports = router;

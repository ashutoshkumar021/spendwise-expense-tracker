const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Rent', 'Groceries', 'Entertainment', 'Utilities', 'Education', 'Insurance', 'Travel', 'Gifts', 'Subscriptions', 'Savings', 'Other'],
    },
    limitAmount: {
      type: Number,
      required: [true, 'Budget limit is required'],
      min: [0, 'Budget limit must be positive'],
    },
    month: {
      type: Number,
      required: [true, 'Month is required'],
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
    },
  },
  { timestamps: true }
);

// Compound unique index: one budget per user per category per month/year
budgetSchema.index({ userId: 1, category: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);

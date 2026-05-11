import { Component, OnInit } from '@angular/core';
import { ExpenseService } from '../../services/expense.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.css']
})
export class ExpensesComponent implements OnInit {
  expenses: any[] = [];
  filteredExpenses: any[] = [];
  loading = true;
  showForm = false;
  editingExpense: any = null;
  deleteConfirmId: string | null = null;

  categories = [
    'Food',
    'Transport', 
    'Shopping',
    'Bills',
    'Health',
    'Rent',
    'Groceries',
    'Entertainment',
    'Utilities',
    'Education',
    'Insurance',
    'Travel',
    'Gifts',
    'Subscriptions',
    'Savings',
    'Other'
  ];

  // Filters
  filterCategory = '';
  filterMonth = '';
  filterYear = '';
  searchQuery = '';
  quickFilter = 'all'; // all, today, week, month
  selectedExpenses: Set<string> = new Set();
  showBulkActions = false;

  // Analytics
  totalSpent = 0;
  averageExpense = 0;
  highestExpense: any = null;
  lowestExpense: any = null;
  categoryTotals: any = {};
  spendingTrend = 'neutral'; // up, down, neutral
  spendingChange = 0;

  // Date range
  dateRangeStart = '';
  dateRangeEnd = '';

  // Form
  formTitle = '';
  formAmount: number | null = null;
  formCategory = '';
  formDate = '';
  formDescription = '';
  formTags: string[] = [];
  formTagInput = '';
  formLoading = false;

  // Tags
  allTags: string[] = [];
  selectedTags: Set<string> = new Set();
  showTagFilter = false;

  constructor(
    private expenseService: ExpenseService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadExpenses();
    this.loadAllTags();
  }

  loadAllTags(): void {
    this.allTags = [];
    this.expenses.forEach(exp => {
      if (exp.tags && Array.isArray(exp.tags)) {
        exp.tags.forEach((tag: string) => {
          if (!this.allTags.includes(tag)) {
            this.allTags.push(tag);
          }
        });
      }
    });
  }

  addTag(): void {
    if (this.formTagInput.trim() && !this.formTags.includes(this.formTagInput.trim())) {
      this.formTags.push(this.formTagInput.trim());
      this.formTagInput = '';
    }
  }

  removeTag(tag: string): void {
    this.formTags = this.formTags.filter(t => t !== tag);
  }

  toggleTagFilter(tag: string): void {
    if (this.selectedTags.has(tag)) {
      this.selectedTags.delete(tag);
    } else {
      this.selectedTags.add(tag);
    }
    this.applyFilters();
  }

  clearTagFilter(): void {
    this.selectedTags.clear();
    this.applyFilters();
  }

  loadExpenses(): void {
    this.loading = true;
    const filters: any = {};
    if (this.filterCategory) filters.category = this.filterCategory;
    if (this.filterMonth && this.filterYear) {
      filters.month = parseInt(this.filterMonth);
      filters.year = parseInt(this.filterYear);
    }

    this.expenseService.getExpenses(filters).subscribe({
      next: (data) => {
        this.expenses = data;
        this.applyFilters();
        this.calculateAnalytics();
        this.loading = false;
      },
      error: () => {
        this.toast.error('Failed to load expenses');
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredExpenses = [...this.expenses];

    // Apply search
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      this.filteredExpenses = this.filteredExpenses.filter(exp => 
        exp.title.toLowerCase().includes(query) ||
        exp.category.toLowerCase().includes(query) ||
        (exp.description && exp.description.toLowerCase().includes(query)) ||
        (exp.tags && exp.tags.some((tag: string) => tag.toLowerCase().includes(query)))
      );
    }

    // Apply tag filter
    if (this.selectedTags.size > 0) {
      this.filteredExpenses = this.filteredExpenses.filter(exp => 
        exp.tags && exp.tags.some((tag: string) => this.selectedTags.has(tag))
      );
    }

    // Apply quick filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (this.quickFilter === 'today') {
      this.filteredExpenses = this.filteredExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.toDateString() === today.toDateString();
      });
    } else if (this.quickFilter === 'week') {
      this.filteredExpenses = this.filteredExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= weekAgo && expDate <= today;
      });
    } else if (this.quickFilter === 'month') {
      this.filteredExpenses = this.filteredExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= monthStart && expDate <= today;
      });
    }

    // Apply date range
    if (this.dateRangeStart && this.dateRangeEnd) {
      const start = new Date(this.dateRangeStart);
      const end = new Date(this.dateRangeEnd);
      this.filteredExpenses = this.filteredExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= start && expDate <= end;
      });
    }

    // Update bulk actions visibility
    this.showBulkActions = this.selectedExpenses.size > 0;
  }

  calculateAnalytics(): void {
    if (this.filteredExpenses.length === 0) {
      this.totalSpent = 0;
      this.averageExpense = 0;
      this.highestExpense = null;
      this.lowestExpense = null;
      this.categoryTotals = {};
      this.spendingTrend = 'neutral';
      this.spendingChange = 0;
      return;
    }

    // Total spent
    this.totalSpent = this.filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Average expense
    this.averageExpense = this.totalSpent / this.filteredExpenses.length;

    // Highest and lowest
    this.highestExpense = this.filteredExpenses.reduce((max, exp) => 
      exp.amount > max.amount ? exp : max, this.filteredExpenses[0]);
    this.lowestExpense = this.filteredExpenses.reduce((min, exp) => 
      exp.amount < min.amount ? exp : min, this.filteredExpenses[0]);

    // Category totals
    this.categoryTotals = {};
    this.filteredExpenses.forEach(exp => {
      if (!this.categoryTotals[exp.category]) {
        this.categoryTotals[exp.category] = 0;
      }
      this.categoryTotals[exp.category] += exp.amount;
    });

    // Calculate spending trend (compare with previous period)
    const now = new Date();
    const currentMonthExpenses = this.expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    });

    const prevMonthExpenses = this.expenses.filter(exp => {
      const expDate = new Date(exp.date);
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return expDate.getMonth() === prevMonth.getMonth() && expDate.getFullYear() === prevMonth.getFullYear();
    });

    const currentTotal = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const prevTotal = prevMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    if (prevTotal > 0) {
      this.spendingChange = ((currentTotal - prevTotal) / prevTotal) * 100;
      this.spendingTrend = this.spendingChange > 0 ? 'up' : this.spendingChange < 0 ? 'down' : 'neutral';
    }
  }

  clearFilters(): void {
    this.filterCategory = '';
    this.filterMonth = '';
    this.filterYear = '';
    this.searchQuery = '';
    this.quickFilter = 'all';
    this.dateRangeStart = '';
    this.dateRangeEnd = '';
    this.selectedExpenses.clear();
    this.showBulkActions = false;
    this.loadExpenses();
  }

  exportToCSV(): void {
    if (this.filteredExpenses.length === 0) {
      this.toast.error('No expenses to export');
      return;
    }

    const headers = ['Date', 'Title', 'Category', 'Amount', 'Description'];
    const rows = this.filteredExpenses.map(exp => [
      this.formatDate(exp.date),
      exp.title,
      exp.category,
      exp.amount.toFixed(2),
      exp.description || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toast.success('Expenses exported successfully');
  }

  exportToJSON(): void {
    if (this.filteredExpenses.length === 0) {
      this.toast.error('No expenses to export');
      return;
    }

    const jsonContent = JSON.stringify(this.filteredExpenses, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.toast.success('Expenses exported successfully');
  }

  toggleExpenseSelection(id: string): void {
    if (this.selectedExpenses.has(id)) {
      this.selectedExpenses.delete(id);
    } else {
      this.selectedExpenses.add(id);
    }
    this.showBulkActions = this.selectedExpenses.size > 0;
  }

  selectAllExpenses(): void {
    this.filteredExpenses.forEach(exp => this.selectedExpenses.add(exp._id));
    this.showBulkActions = true;
  }

  clearSelection(): void {
    this.selectedExpenses.clear();
    this.showBulkActions = false;
  }

  deleteSelectedExpenses(): void {
    if (this.selectedExpenses.size === 0) {
      this.toast.error('No expenses selected');
      return;
    }

    const ids = Array.from(this.selectedExpenses);
    let deletedCount = 0;

    ids.forEach(id => {
      this.expenseService.deleteExpense(id).subscribe({
        next: () => {
          deletedCount++;
          if (deletedCount === ids.length) {
            this.toast.success(`${deletedCount} expenses deleted successfully`);
            this.selectedExpenses.clear();
            this.showBulkActions = false;
            this.loadExpenses();
          }
        },
        error: () => {
          this.toast.error('Failed to delete some expenses');
        }
      });
    });
  }

  duplicateExpense(expense: any): void {
    const duplicate = {
      title: expense.title + ' (Copy)',
      amount: expense.amount,
      category: expense.category,
      date: new Date().toISOString().split('T')[0],
      description: expense.description || ''
    };

    this.expenseService.addExpense(duplicate).subscribe({
      next: () => {
        this.toast.success('Expense duplicated successfully');
        this.loadExpenses();
      },
      error: () => {
        this.toast.error('Failed to duplicate expense');
      }
    });
  }

  checkForDuplicates(): void {
    const duplicates: any[] = [];
    const seen = new Map();

    this.expenses.forEach(exp => {
      const key = `${exp.title}_${exp.amount}_${exp.category}`;
      if (seen.has(key)) {
        duplicates.push(exp);
      } else {
        seen.set(key, exp);
      }
    });

    if (duplicates.length > 0) {
      this.toast.warning(`Found ${duplicates.length} potential duplicate expenses`);
    } else {
      this.toast.success('No duplicate expenses found');
    }
  }

  getCategoryPercentage(category: string): number {
    if (this.totalSpent === 0) return 0;
    const categoryTotal = this.categoryTotals[category] || 0;
    return ((categoryTotal / this.totalSpent) * 100).toFixed(1) as any;
  }

  getExpenseTags(expense: any): string[] {
    return expense.tags || [];
  }

  getTagColor(tag: string): string {
    const colors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#14b8a6'];
    const index = this.allTags.indexOf(tag);
    return colors[index % colors.length];
  }

  getPopularTags(limit: number = 5): string[] {
    const tagCounts: any = {};
    this.expenses.forEach(exp => {
      if (exp.tags && Array.isArray(exp.tags)) {
        exp.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(tagCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, limit)
      .map((entry: any) => entry[0]);
  }

  openAddForm(): void {
    this.editingExpense = null;
    this.formTitle = '';
    this.formAmount = null;
    this.formCategory = '';
    this.formDate = new Date().toISOString().split('T')[0];
    this.formDescription = '';
    this.formTags = [];
    this.formTagInput = '';
    this.showForm = true;
  }

  openEditForm(expense: any): void {
    this.editingExpense = expense;
    this.formTitle = expense.title;
    this.formAmount = expense.amount;
    this.formCategory = expense.category;
    this.formDate = new Date(expense.date).toISOString().split('T')[0];
    this.formDescription = expense.description || '';
    this.formTags = expense.tags || [];
    this.formTagInput = '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingExpense = null;
  }

  submitForm(): void {
    if (!this.formTitle || !this.formAmount || !this.formCategory) {
      this.toast.error('Please fill in title, amount, and category');
      return;
    }
    if (this.formAmount <= 0) {
      this.toast.error('Amount must be a positive number');
      return;
    }

    this.formLoading = true;
    const data = {
      title: this.formTitle,
      amount: this.formAmount,
      category: this.formCategory,
      date: this.formDate || new Date(),
      description: this.formDescription,
      tags: this.formTags
    };

    if (this.editingExpense) {
      this.expenseService.updateExpense(this.editingExpense._id, data).subscribe({
        next: () => {
          this.toast.success('Expense updated successfully');
          this.formLoading = false;
          this.closeForm();
          this.loadExpenses();
        },
        error: () => {
          this.toast.error('Failed to update expense');
          this.formLoading = false;
        }
      });
    } else {
      this.expenseService.addExpense(data).subscribe({
        next: () => {
          this.toast.success('Expense added successfully');
          this.formLoading = false;
          this.closeForm();
          this.loadExpenses();
        },
        error: () => {
          this.toast.error('Failed to add expense');
          this.formLoading = false;
        }
      });
    }
  }

  confirmDelete(id: string): void {
    this.deleteConfirmId = id;
  }

  cancelDelete(): void {
    this.deleteConfirmId = null;
  }

  deleteExpense(id: string): void {
    this.expenseService.deleteExpense(id).subscribe({
      next: () => {
        this.toast.success('Expense deleted successfully');
        this.deleteConfirmId = null;
        this.loadExpenses();
      },
      error: () => {
        this.toast.error('Failed to delete expense');
        this.deleteConfirmId = null;
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  getCategoryIcon(category: string): string {
    const icons: any = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '📄', Health: '💊', Other: '📦' };
    return icons[category] || '📦';
  }

  get years(): number[] {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }

  get quickFilters(): any[] {
    return [
      { value: 'all', label: 'All Time', count: this.expenses.length },
      { value: 'today', label: 'Today', count: this.getTodayCount() },
      { value: 'week', label: 'This Week', count: this.getWeekCount() },
      { value: 'month', label: 'This Month', count: this.getMonthCount() }
    ];
  }

  private getTodayCount(): number {
    const today = new Date();
    return this.expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.toDateString() === today.toDateString();
    }).length;
  }

  private getWeekCount(): number {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= weekAgo && expDate <= today;
    }).length;
  }

  private getMonthCount(): number {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= monthStart && expDate <= now;
    }).length;
  }

  getSpendingTrendIcon(): string {
    return this.spendingTrend === 'up' ? '📈' : this.spendingTrend === 'down' ? '📉' : '➡️';
  }

  getSpendingTrendColor(): string {
    return this.spendingTrend === 'up' ? 'text-danger' : this.spendingTrend === 'down' ? 'text-success' : 'text-muted';
  }
}

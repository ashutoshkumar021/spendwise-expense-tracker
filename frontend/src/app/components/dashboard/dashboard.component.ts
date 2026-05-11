import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { ExpenseService } from '../../services/expense.service';
import { BudgetService } from '../../services/budget.service';
import { IncomeService } from '../../services/income.service';
import { ToastService } from '../../services/toast.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewChecked {
  totalSpent = 0;
  totalIncome = 0;
  totalBudget = 0;
  transactionCount = 0;
  budgetStatus: any[] = [];
  loading = true;
  hasCategoryData = false;
  hasMonthlyData = false;

  // Savings
  totalSavings = 0;
  savingsRate = 0;
  savingsStatus = 'neutral';
  projectedSavings = 0;

  // Quick stats
  averageDailySpend = 0;
  remainingBudget = 0;
  
  budgetUtilization = 0;
  topCategory: any = null;
  spendingTrend = 'neutral';
  monthlyChange = 0;
  daysInMonth = 30;
  daysRemaining = 0;
  projectedSpend = 0;

  // Alerts
  budgetAlerts: any[] = [];
  showInfoBanner = true;

  // Spending Goals
  monthlySpendingGoal = 0;
  goalProgress = 0;
  goalStatus = 'neutral';
  goalRemaining = 0;
  showGoalInput = false;
  goalInputValue: number | null = null;

  // Quick Add Expense
  showQuickAdd = false;
  quickAddTitle = '';
  quickAddAmount: number | null = null;
  quickAddCategory = '';
  quickAddDate = '';
  quickAddLoading = false;

  // Privacy toggle - separate for each section
  incomePrivacyMode = true;
  spentPrivacyMode = true;
  savingsPrivacyMode = true;

  private pieChart: any = null;
  private barChart: any = null;
  private chartsNeedCreation = false;
  private categoryDataForCharts: any[] = [];
  private monthlyDataForCharts: any[] = [];

  // Cached financial insights data
  currentSuggestions: any[] = [];
  currentInvestmentOptions: any[] = [];

  // Investment Modal
  showInvestmentModal = false;
  selectedInvestment: any = null;

  constructor(
    private expenseService: ExpenseService,
    private budgetService: BudgetService,
    private incomeService: IncomeService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    // Load spending goal from localStorage
    const savedGoal = localStorage.getItem('monthlySpendingGoal');
    if (savedGoal) {
      this.monthlySpendingGoal = parseFloat(savedGoal);
    }

    this.loadData();
  }

  loadData(): void {
    this.loading = true;

    this.expenseService.getSummary().subscribe({
      next: (data) => {
        console.log('Expense summary data received:', data);
        console.log('Category totals:', data.categoryTotals);
        console.log('Monthly totals:', data.monthlyTotals);
        
        this.totalSpent = data.categoryTotals.reduce((sum: number, c: any) => sum + c.total, 0);
        this.transactionCount = 0;

        this.hasCategoryData = data.categoryTotals.length > 0;
        this.hasMonthlyData = data.monthlyTotals.length > 0;
        console.log('Has category data:', this.hasCategoryData, 'Has monthly data:', this.hasMonthlyData);

        // Get transaction count from current month expenses
        const now = new Date();
        this.expenseService.getExpenses({ month: now.getMonth() + 1, year: now.getFullYear() }).subscribe({
          next: (expenses) => {
            this.transactionCount = expenses.length;
            this.calculateQuickStats(expenses, data.categoryTotals);
          }
        });

        // Always create charts, even with empty data (with delay for DOM readiness)
        this.categoryDataForCharts = data.categoryTotals;
        this.monthlyDataForCharts = data.monthlyTotals;
        this.chartsNeedCreation = true;
      },
      error: () => {
        this.loading = false;
        // Create empty charts on error (with delay for DOM readiness)
        setTimeout(() => {
          this.createPieChart([]);
          this.createBarChart([]);
        }, 100);
      }
    });

    this.incomeService.getSummary().subscribe({
      next: (data) => {
        console.log('Income summary data received:', data);
        this.totalIncome = data.totalCurrentMonth;
        this.calculateSavings();
      },
      error: (error) => {
        console.error('Income service error:', error);
        this.loading = false;
      }
    });

    this.budgetService.getBudgetStatus().subscribe({
      next: (status) => {
        console.log('Budget status data received:', status);
        this.budgetStatus = status;
        this.totalBudget = status.reduce((sum: number, s: any) => sum + s.limit, 0);
        this.calculateBudgetAlerts(status);
        
        // Cache financial insights data
        this.currentSuggestions = this.calculateSuggestions();
        this.currentInvestmentOptions = this.calculateInvestmentOptions();
        
        this.loading = false;

        // Charts will be created in ngAfterViewChecked
        this.chartsNeedCreation = true;
      },
      error: (error) => {
        console.error('Budget service error:', error);
        this.loading = false;

        // Ensure charts are created even on error
        this.categoryDataForCharts = [];
        this.monthlyDataForCharts = [];
        this.chartsNeedCreation = true;

        // Cache empty financial insights data on error
        this.currentSuggestions = [];
        this.currentInvestmentOptions = [];
      }
    });
  }

  ngAfterViewChecked(): void {
    // Create charts after DOM is fully rendered
    if (this.chartsNeedCreation && !this.loading) {
      console.log('ngAfterViewChecked: Creating charts...');
      this.chartsNeedCreation = false;
      
      setTimeout(() => {
        this.createPieChart(this.categoryDataForCharts);
        this.createBarChart(this.monthlyDataForCharts);
      }, 50);
    }
  }

  calculateQuickStats(expenses: any[], categoryTotals: any[]): void {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    this.daysInMonth = daysInMonth;
    this.daysRemaining = daysRemaining;

    // Average daily spend
    this.averageDailySpend = this.totalSpent / daysPassed;

    // Remaining budget
    this.remainingBudget = Math.max(0, this.totalBudget - this.totalSpent);

    // Budget utilization
    this.budgetUtilization = this.totalBudget > 0 ? (this.totalSpent / this.totalBudget) * 100 : 0;

    // Top spending category
    if (categoryTotals.length > 0) {
      this.topCategory = categoryTotals.reduce((max: any, cat: any) => 
        cat.total > max.total ? cat : max, categoryTotals[0]);
    }

    // Projected spend
    this.projectedSpend = this.averageDailySpend * daysInMonth;

    // Calculate spending goal progress
    this.calculateGoalProgress();

    // Calculate monthly spending trend
    const currentMonthExpenses = expenses;
    const prevMonthExpenses: any[] = [];
    
    this.expenseService.getExpenses({
      month: now.getMonth(), 
      year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear() 
    }).subscribe({
      next: (prevExpenses: any[]) => {
        const currentTotal = currentMonthExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
        const prevTotal = prevExpenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);

        if (prevTotal > 0) {
          this.monthlyChange = ((currentTotal - prevTotal) / prevTotal) * 100;
          this.spendingTrend = this.monthlyChange > 0 ? 'up' : this.monthlyChange < 0 ? 'down' : 'neutral';
        }
      }
    });
  }

  calculateGoalProgress(): void {
    if (this.monthlySpendingGoal === 0) {
      this.goalProgress = 0;
      this.goalStatus = 'neutral';
      this.goalRemaining = 0;
      return;
    }

    this.goalProgress = (this.totalSpent / this.monthlySpendingGoal) * 100;
    this.goalRemaining = Math.max(0, this.monthlySpendingGoal - this.totalSpent);

    if (this.goalProgress >= 100) {
      this.goalStatus = 'exceeded';
    } else if (this.goalProgress >= 80) {
      this.goalStatus = 'warning';
    } else {
      this.goalStatus = 'safe';
    }
  }

  calculateSavings(): void {
    this.totalSavings = this.totalIncome - this.totalSpent;
    
    if (this.totalIncome > 0) {
      this.savingsRate = (this.totalSavings / this.totalIncome) * 100;
    } else {
      this.savingsRate = 0;
    }

    if (this.savingsRate >= 20) {
      this.savingsStatus = 'excellent';
    } else if (this.savingsRate >= 10) {
      this.savingsStatus = 'good';
    } else if (this.savingsRate >= 0) {
      this.savingsStatus = 'fair';
    } else {
      this.savingsStatus = 'poor';
    }

    // Calculate projected savings
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const avgDailyIncome = this.totalIncome / daysPassed;
    this.projectedSavings = (avgDailyIncome * daysInMonth) - this.projectedSpend;
  }

  calculateBudgetAlerts(status: any[]): void {
    this.budgetAlerts = [];

    status.forEach(item => {
      if (item.status === 'exceeded') {
        this.budgetAlerts.push({
          type: 'danger',
          category: item.category,
          message: `${item.category} budget exceeded by ₹${(item.spent - item.limit).toFixed(2)}`
        });
      } else if (item.status === 'warning') {
        const percentage = (item.spent / item.limit) * 100;
        this.budgetAlerts.push({
          type: 'warning',
          category: item.category,
          message: `${item.category} budget ${percentage.toFixed(0)}% used`
        });
      }
    });
  }

  dismissInfoBanner(): void {
    this.showInfoBanner = false;
  }

  // Spending Goal Methods
  openGoalInput(): void {
    this.showGoalInput = true;
    this.goalInputValue = this.monthlySpendingGoal;
  }

  closeGoalInput(): void {
    this.showGoalInput = false;
    this.goalInputValue = null;
  }

  saveSpendingGoal(): void {
    if (this.goalInputValue === null || this.goalInputValue <= 0) {
      this.toast.error('Please enter a valid spending goal');
      return;
    }

    this.monthlySpendingGoal = this.goalInputValue;
    this.calculateGoalProgress();
    this.closeGoalInput();
    this.toast.success('Spending goal saved successfully');

    // Save to localStorage for persistence
    localStorage.setItem('monthlySpendingGoal', this.monthlySpendingGoal.toString());
  }

  clearSpendingGoal(): void {
    this.monthlySpendingGoal = 0;
    this.goalProgress = 0;
    this.goalStatus = 'neutral';
    this.goalRemaining = 0;
    localStorage.removeItem('monthlySpendingGoal');
    this.toast.success('Spending goal cleared');
  }

  getGoalStatusIcon(): string {
    return this.goalStatus === 'exceeded' ? '⚠️' : this.goalStatus === 'warning' ? '🔔' : '✅';
  }

  getGoalStatusColor(): string {
    return this.goalStatus === 'exceeded' ? 'danger' : this.goalStatus === 'warning' ? 'warning' : 'success';
  }

  // Quick Add Expense Methods
  openQuickAdd(): void {
    this.showQuickAdd = true;
    this.quickAddTitle = '';
    this.quickAddAmount = null;
    this.quickAddCategory = '';
    this.quickAddDate = new Date().toISOString().split('T')[0];
  }

  closeQuickAdd(): void {
    this.showQuickAdd = false;
    this.quickAddTitle = '';
    this.quickAddAmount = null;
    this.quickAddCategory = '';
  }

  submitQuickAdd(): void {
    if (!this.quickAddTitle || !this.quickAddAmount || !this.quickAddCategory) {
      this.toast.error('Please fill in title, amount, and category');
      return;
    }
    if (this.quickAddAmount <= 0) {
      this.toast.error('Amount must be a positive number');
      return;
    }

    this.quickAddLoading = true;
    const data = {
      title: this.quickAddTitle,
      amount: this.quickAddAmount,
      category: this.quickAddCategory,
      date: this.quickAddDate || new Date(),
      description: ''
    };

    this.expenseService.addExpense(data).subscribe({
      next: () => {
        this.toast.success('Expense added successfully');
        this.quickAddLoading = false;
        this.closeQuickAdd();
        this.loadData();
      },
      error: () => {
        this.toast.error('Failed to add expense');
        this.quickAddLoading = false;
      }
    });
  }

  get quickAddCategories(): string[] {
    return ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Rent', 'Groceries', 'Entertainment', 'Utilities', 'Education', 'Insurance', 'Travel', 'Gifts', 'Subscriptions', 'Savings', 'Other'];
  }

  createPieChart(categoryTotals: any[]): void {
    console.log('Creating pie chart with data:', categoryTotals);
    const canvas = document.getElementById('pieChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Pie chart canvas not found');
      return;
    }

    console.log('Pie chart canvas found, dimensions:', canvas.width, 'x', canvas.height);

    if (this.pieChart) this.pieChart.destroy();

    // Handle empty data
    if (!categoryTotals || categoryTotals.length === 0) {
      this.pieChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: ['No Data'],
          datasets: [{
            data: [1],
            backgroundColor: ['#e5e7eb'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      });
      console.log('Empty pie chart created successfully');
      return;
    }

    const colors = ['#f43f5e', '#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#6366f1'];
    const labels = categoryTotals.map(c => c.category);
    const data = categoryTotals.map(c => c.total);

    this.pieChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#374151',
              padding: 16,
              usePointStyle: true,
              font: { size: 12 }
            }
          }
        },
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        },
        cutout: '65%'
      }
    });
  }

  createBarChart(monthlyTotals: any[]): void {
    console.log('Creating bar chart with data:', monthlyTotals);
    const canvas = document.getElementById('barChart') as HTMLCanvasElement;
    if (!canvas) {
      console.error('Bar chart canvas not found');
      return;
    }

    console.log('Bar chart canvas found, dimensions:', canvas.width, 'x', canvas.height);

    if (this.barChart) this.barChart.destroy();

    // Handle empty data
    if (!monthlyTotals || monthlyTotals.length === 0) {
      this.barChart = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: ['No Data'],
          datasets: [{
            label: 'Monthly Spending',
            data: [0],
            backgroundColor: ['#e5e7eb'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          },
          scales: {
            y: { display: false },
            x: { display: false }
          }
        }
      });
      console.log('Empty bar chart created successfully');
      return;
    }

    const labels = monthlyTotals.map(m => `${m.month} ${m.year}`);
    const data = monthlyTotals.map(m => m.total);

    this.barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Spending (₹)',
          data,
          backgroundColor: 'rgba(124, 58, 237, 0.6)',
          borderColor: '#7c3aed',
          borderWidth: 1,
          borderRadius: 8,
          barThickness: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#374151',
              font: { size: 12 }
            }
          }
        },
        layout: {
          padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
          }
        },
        scales: {
          x: {
            ticks: { color: '#6b7280' },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          y: {
            ticks: { color: '#6b7280' },
            grid: { color: 'rgba(0,0,0,0.05)' }
          }
        }
      }
    });
  }

  getStatusClass(status: string): string {
    return status === 'exceeded' ? 'status-danger' : status === 'warning' ? 'status-warning' : 'status-safe';
  }

  getCategoryIcon(category: string): string {
    const icons: any = { 
      Food: '🍔', 
      Transport: '🚗', 
      Shopping: '🛍️', 
      Bills: '📄', 
      Health: '💊', 
      Rent: '🏠',
      Groceries: '🛒',
      Entertainment: '🎬',
      Utilities: '💡',
      Education: '📚',
      Insurance: '🛡️',
      Travel: '✈️',
      Gifts: '🎁',
      Subscriptions: '📱',
      Savings: '💰',
      Other: '📦' 
    };
    return icons[category] || '📦';
  }

  getSpendingTrendIcon(): string {
    return this.spendingTrend === 'up' ? '📈' : this.spendingTrend === 'down' ? '📉' : '➡️';
  }

  getSpendingTrendColor(): string {
    return this.spendingTrend === 'up' ? 'text-danger' : this.spendingTrend === 'down' ? 'text-success' : 'text-muted';
  }

  getBudgetUtilizationClass(): string {
    if (this.budgetUtilization >= 90) return 'danger';
    if (this.budgetUtilization >= 70) return 'warning';
    return 'safe';
  }

  getSavingsStatusIcon(): string {
    return this.savingsStatus === 'excellent' ? '🌟' : this.savingsStatus === 'good' ? '✨' : this.savingsStatus === 'fair' ? '📊' : '⚠️';
  }

  getSavingsStatusColor(): string {
    return this.savingsStatus === 'excellent' ? 'success' : this.savingsStatus === 'good' ? 'primary' : this.savingsStatus === 'fair' ? 'warning' : 'danger';
  }

  getSavingsStatusLabel(): string {
    return this.savingsStatus === 'excellent' ? 'Excellent' : this.savingsStatus === 'good' ? 'Good' : this.savingsStatus === 'fair' ? 'Fair' : 'Needs Improvement';
  }

  // Privacy toggle methods for each section
  toggleIncomePrivacy(): void {
    this.incomePrivacyMode = !this.incomePrivacyMode;
  }

  toggleSpentPrivacy(): void {
    this.spentPrivacyMode = !this.spentPrivacyMode;
  }

  toggleSavingsPrivacy(): void {
    this.savingsPrivacyMode = !this.savingsPrivacyMode;
  }

  formatAmount(amount: number, privacyMode?: boolean): string {
    if (privacyMode) {
      return '••••••';
    }
    return `₹${amount.toFixed(2)}`;
  }

  formatPercentage(percentage: number, privacyMode?: boolean): string {
    if (privacyMode) {
      return '••%';
    }
    return `${percentage.toFixed(1)}%`;
  }

  getAlertCount(): number {
    return this.budgetAlerts.filter(alert => alert.type === 'danger').length;
  }

  getWarningCount(): number {
    return this.budgetAlerts.filter(alert => alert.type === 'warning').length;
  }

  // ===== FINANCIAL INSIGHTS METHODS =====

  get financialHealthScore(): number {
    if (this.totalIncome <= 0) return 0;
    
    let score = 100;
    
    // Deduct for high spending ratio
    const spendingRatio = this.totalSpent / this.totalIncome;
    if (spendingRatio > 0.9) score -= 30;
    else if (spendingRatio > 0.8) score -= 20;
    else if (spendingRatio > 0.7) score -= 10;
    
    // Deduct for exceeded budgets
    score -= this.budgetAlerts.filter(a => a.type === 'danger').length * 10;
    
    // Add bonus for good savings rate
    const savingsRate = ((this.totalIncome - this.totalSpent) / this.totalIncome) * 100;
    if (savingsRate >= 20) score += 10;
    else if (savingsRate >= 10) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  getHealthScoreClass(): string {
    const score = this.financialHealthScore;
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  getFinancialHealthMessage(): string {
    const score = this.financialHealthScore;
    if (score >= 80) return '🌟 Excellent! Your financial health is outstanding. Keep up the great savings habits!';
    if (score >= 60) return '✨ Good job! Your finances are on track. Consider increasing savings for better security.';
    if (score >= 40) return '⚠️ Fair. You\'re managing, but there\'s room for improvement. Watch your spending!';
    return '🚨 Alert! Your spending is high. Consider creating a stricter budget and cutting unnecessary expenses.';
  }

  getSavingsClass(): string {
    const remaining = this.totalIncome - this.totalSpent;
    if (remaining <= 0) return 'negative';
    if (remaining < this.totalIncome * 0.1) return 'low';
    if (remaining < this.totalIncome * 0.2) return 'moderate';
    return 'good';
  }

  calculateSuggestions(): any[] {
    const suggestions: any[] = [];
    const savings = this.totalIncome - this.totalSpent;
    const savingsRate = this.totalIncome > 0 ? (savings / this.totalIncome) * 100 : 0;
    
    // Spending too much
    if (this.totalSpent > this.totalIncome * 0.9) {
      suggestions.push({
        type: 'warning',
        icon: '⚠️',
        title: 'High Spending Alert',
        text: `You've used ${((this.totalSpent / this.totalIncome) * 100).toFixed(1)}% of your income. Consider reviewing non-essential expenses.`
      });
    }
    
    // Good savings
    if (savingsRate >= 20) {
      suggestions.push({
        type: 'success',
        icon: '🎯',
        title: 'Great Savings!',
        text: `You're saving ${savingsRate.toFixed(1)}% of your income. Consider investing the surplus for long-term growth.`
      });
    }
    
    // Low savings
    if (savingsRate > 0 && savingsRate < 10) {
      suggestions.push({
        type: 'info',
        icon: '💡',
        title: 'Build Emergency Fund',
        text: 'Aim to save at least 3-6 months of expenses. Start with small automatic transfers to savings.'
      });
    }
    
    // Budget alerts
    if (this.budgetAlerts.length > 0) {
      const dangerCount = this.budgetAlerts.filter(a => a.type === 'danger').length;
      if (dangerCount > 0) {
        suggestions.push({
          type: 'danger',
          icon: '🚨',
          title: 'Budget Overrun',
          text: `${dangerCount} budget(s) exceeded. Review your spending in these categories immediately.`
        });
      }
    }
    
    // 50-30-20 rule suggestion
    if (this.totalIncome > 0) {
      const needs = this.budgetStatus.filter(b => ['Rent', 'Utilities', 'Bills', 'Groceries'].includes(b.category))
        .reduce((sum, b) => sum + b.spent, 0);
      const needsRatio = (needs / this.totalIncome) * 100;
      
      if (needsRatio > 50) {
        suggestions.push({
          type: 'info',
          icon: '🏠',
          title: '50-30-20 Rule',
          text: `Your essential expenses are ${needsRatio.toFixed(1)}% of income. Try to keep needs under 50%.`
        });
      }
    }
    
    return suggestions;
  }

  calculateInvestmentOptions(): any[] {
    const savings = this.totalIncome - this.totalSpent;
    if (savings <= 0) return [];
    
    const options = [];
    
    // Emergency Fund (always suggested)
    options.push({
      icon: '🛡️',
      name: 'Emergency Fund',
      risk: 'low',
      riskLabel: 'Safe',
      returns: '3-4% annually',
      suggestedAmount: Math.min(savings * 0.3, this.totalIncome * 0.1),
      description: 'Liquid savings for unexpected expenses. Keep 3-6 months of expenses in a high-yield savings account or liquid fund.'
    });
    
    // SIP/Index Funds
    if (savings > 5000) {
      options.push({
        icon: '📈',
        name: 'SIP - Index Funds',
        risk: 'medium',
        riskLabel: 'Moderate',
        returns: '10-15% annually',
        suggestedAmount: savings * 0.4,
        description: 'Monthly investments in Nifty 50 or Sensex index funds for long-term wealth creation through compounding.'
      });
    }
    
    // PPF/Public Provident Fund
    if (savings > 10000) {
      options.push({
        icon: '🔒',
        name: 'PPF Account',
        risk: 'low',
        riskLabel: 'Safe',
        returns: '7-8% tax-free',
        suggestedAmount: Math.min(12500, savings * 0.2), // Max 1.5L per year
        description: 'Government-backed long-term investment with tax benefits under Section 80C. Lock-in period of 15 years.'
      });
    }
    
    // Gold/Sovereign Gold Bonds
    if (savings > 15000) {
      options.push({
        icon: '🥇',
        name: 'Gold Investment',
        risk: 'medium',
        riskLabel: 'Moderate',
        returns: '8-10% annually',
        suggestedAmount: savings * 0.1,
        description: 'Sovereign Gold Bonds or Gold ETFs. Good hedge against inflation and market volatility.'
      });
    }
    
    // Mutual Funds - Equity
    if (savings > 20000) {
      options.push({
        icon: '🚀',
        name: 'Equity Mutual Funds',
        risk: 'high',
        riskLabel: 'High',
        returns: '12-18% annually',
        suggestedAmount: savings * 0.2,
        description: 'Diversified equity funds for higher returns. Best for 5+ year investment horizon. Market-linked risk.'
      });
    }
    
    // NPS/National Pension System
    if (savings > 25000) {
      options.push({
        icon: '👴',
        name: 'NPS Tier 1',
        risk: 'medium',
        riskLabel: 'Moderate',
        returns: '9-12% annually',
        suggestedAmount: Math.min(5000, savings * 0.1),
        description: 'Retirement-focused investment with tax benefits. Mix of equity, corporate bonds, and government securities.'
      });
    }
    
    return options;
  }

  // Getter methods that return cached data (for template use)
  getSuggestions(): any[] {
    return this.currentSuggestions;
  }

  getInvestmentOptions(): any[] {
    return this.currentInvestmentOptions;
  }

  // ===== INVESTMENT MODAL METHODS =====

  openInvestmentModal(investment: any): void {
    try {
      this.selectedInvestment = investment;
      this.showInvestmentModal = true;
      document.body.style.overflow = 'hidden';
    } catch (error) {
      console.error('Error opening modal:', error);
    }
  }

  closeInvestmentModal(): void {
    this.showInvestmentModal = false;
    this.selectedInvestment = null;
    document.body.style.overflow = '';
  }

  getInvestmentTips(investment: any): any[] {
    const tips: any[] = [];

    switch(investment.name) {
      case 'Emergency Fund':
        tips.push({
          icon: '💡',
          title: 'Start Small',
          text: 'Begin with ₹1,000-2,000 per month and gradually increase to build 3-6 months of expenses.'
        });
        tips.push({
          icon: '🏦',
          title: 'Choose High-Yield Savings',
          text: 'Use high-yield savings accounts or liquid funds for better returns than regular savings accounts.'
        });
        tips.push({
          icon: '📊',
          title: 'Track Progress',
          text: 'Set a target amount and track monthly progress. Aim for at least ₹50,000-1,00,000 as emergency fund.'
        });
        break;

      case 'SIP - Index Funds':
        tips.push({
          icon: '📅',
          title: 'Start Early',
          text: 'The earlier you start SIP, the more you benefit from compounding. Even ₹500/month can grow significantly.'
        });
        tips.push({
          icon: '🎯',
          title: 'Choose Nifty 50/Sensex',
          text: 'Invest in broad market index funds like Nifty 50 or Sensex for diversified, low-risk exposure.'
        });
        tips.push({
          icon: '💰',
          title: 'Increase Gradually',
          text: 'Start with 10% of savings and increase by 1-2% every year as income grows.'
        });
        tips.push({
          icon: '⏰',
          title: 'Stay Invested',
          text: 'SIP works best with long-term commitment (5+ years). Don\'t stop during market downturns.'
        });
        break;

      case 'PPF Account':
        tips.push({
          icon: '🔒',
          title: 'Lock-in Period',
          text: 'PPF has 15-year lock-in. Consider this for long-term goals like retirement or children\'s education.'
        });
        tips.push({
          icon: '💰',
          title: 'Maximize Tax Benefits',
          text: 'Invest up to ₹1.5L annually for tax deduction under Section 80C. Interest is also tax-free.'
        });
        tips.push({
          icon: '📅',
          title: 'Invest Before 5th',
          text: 'Deposit before 5th of each month to earn interest for full month.'
        });
        break;

      case 'Gold Investment':
        tips.push({
          icon: '🥇',
          title: 'Diversify',
          text: 'Gold should be 5-10% of your portfolio. It provides hedge against inflation and market volatility.'
        });
        tips.push({
          icon: '📈',
          title: 'Sovereign Gold Bonds',
          text: 'Consider SGBs over physical gold - no storage issues, 2.5% annual interest, tax benefits.'
        });
        tips.push({
          icon: '📊',
          title: 'Gold ETFs',
          text: 'Gold ETFs offer liquidity and can be bought/sold like stocks. Good for short to medium term.'
        });
        break;

      case 'Equity Mutual Funds':
        tips.push({
          icon: '🎯',
          title: 'Start with Index Funds',
          text: 'Begin with index funds before moving to actively managed funds for lower risk and consistent returns.'
        });
        tips.push({
          icon: '📊',
          title: 'Diversify',
          text: 'Don\'t put all money in one fund. Spread across large-cap, mid-cap, and small-cap funds.'
        });
        tips.push({
          icon: '⏰',
          title: 'Long-term View',
          text: 'Equity funds are volatile short-term but historically give 12-18% returns over 5+ years.'
        });
        tips.push({
          icon: '🔍',
          title: 'Check Fund Performance',
          text: 'Look at 5-year returns, expense ratio (<1.5%), and fund manager track record before investing.'
        });
        break;

      case 'NPS Tier 1':
        tips.push({
          icon: '👴',
          title: 'Retirement Planning',
          text: 'NPS is excellent for long-term retirement savings with tax benefits and professional fund management.'
        });
        tips.push({
          icon: '💰',
          title: 'Tax Benefits',
          text: 'Get tax deduction up to ₹1.5L under Section 80CCD(1B) plus additional ₹50,000 under 80CCD(1B).'
        });
        tips.push({
          icon: '📊',
          title: 'Asset Allocation',
          text: 'Choose auto-choice lifecycle fund that automatically reduces equity exposure as you near retirement.'
        });
        break;
    }

    return tips;
  }

  getInvestmentResources(investment: any): any[] {
    const resources: any[] = [];

    switch(investment.name) {
      case 'Emergency Fund':
        resources.push({
          icon: '🏦',
          name: 'Compare High-Yield Savings',
          url: 'https://www.bankbazaar.com/fixed-deposit-interest-rates.html'
        });
        resources.push({
          icon: '📊',
          name: 'Emergency Fund Calculator',
          url: 'https://cleartax.in/s/emergency-fund-calculator'
        });
        break;

      case 'SIP - Index Funds':
        resources.push({
          icon: '📊',
          name: 'SIP Calculator',
          url: 'https://www.moneycontrol.com/personal-finance/tools/sip-calculator.html'
        });
        resources.push({
          icon: '🏦',
          name: 'Best Index Funds',
          url: 'https://www.valueresearchonline.com/funds/'
        });
        resources.push({
          icon: '📱',
          name: 'Zerodha/Kite',
          url: 'https://zerodha.com/'
        });
        break;

      case 'PPF Account':
        resources.push({
          icon: '🏦',
          name: 'Open PPF Account',
          url: 'https://www.onlinesbi.sbi/sbicollect/'
        });
        resources.push({
          icon: '📊',
          name: 'PPF Interest Calculator',
          url: 'https://cleartax.in/s/ppf-calculator'
        });
        break;

      case 'Gold Investment':
        resources.push({
          icon: '🏦',
          name: 'Sovereign Gold Bonds',
          url: 'https://rbi.org.in/scripts/BS_ViewSGB.aspx'
        });
        resources.push({
          icon: '📊',
          name: 'Gold Price Tracker',
          url: 'https://www.gold.org/'
        });
        break;

      case 'Equity Mutual Funds':
        resources.push({
          icon: '📊',
          name: 'Mutual Fund Research',
          url: 'https://www.valueresearchonline.com/funds/'
        });
        resources.push({
          icon: '💰',
          name: 'Groww/Zerodha',
          url: 'https://groww.in/'
        });
        resources.push({
          icon: '📱',
          name: 'MF Calculator',
          url: 'https://www.moneycontrol.com/personal-finance/tools/mutual-fund-calculator.html'
        });
        break;

      case 'NPS Tier 1':
        resources.push({
          icon: '🏛️',
          name: 'NPS Official Website',
          url: 'https://nps-trust.gov.in/'
        });
        resources.push({
          icon: '📊',
          name: 'NPS Calculator',
          url: 'https://enps.nsdl.com/eNPS/NationalPensionSystem.html'
        });
        break;
    }

    return resources;
  }

  copyInvestmentDetails(): void {
    if (!this.selectedInvestment) return;

    const text = `
💰 ${this.selectedInvestment.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Risk Level: ${this.selectedInvestment.riskLabel}
Expected Returns: ${this.selectedInvestment.returns}
Suggested Amount: ₹${this.selectedInvestment.suggestedAmount.toFixed(2)}

Description:
${this.selectedInvestment.description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by SpendWise
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      this.toast.success('Investment details copied to clipboard!');
    }).catch(() => {
      this.toast.error('Failed to copy details');
    });
  }
}

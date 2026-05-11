import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { BudgetService } from '../../services/budget.service';
import { ToastService } from '../../services/toast.service';

Chart.register(...registerables);

@Component({
  selector: 'app-budget',
  templateUrl: './budget.component.html',
  styleUrls: ['./budget.component.css']
})
export class BudgetComponent implements OnInit {
  budgets: any[] = [];
  budgetStatus: any[] = [];
  loading = true;

  categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Rent', 'Groceries', 'Entertainment', 'Utilities', 'Education', 'Insurance', 'Travel', 'Gifts', 'Subscriptions', 'Savings', 'Other'];

  // Budget summary
  totalBudget = 0;
  totalSpent = 0;
  remainingBudget = 0;
  budgetUtilization = 0;
  exceededBudgets = 0;
  warningBudgets = 0;
  safeBudgets = 0;

  // Analytics
  averageBudgetPerCategory = 0;
  highestBudgetCategory: any = null;
  lowestBudgetCategory: any = null;
  mostOverspentCategory: any = null;

  // Alerts
  showBudgetAlerts = true;
  budgetAlerts: any[] = [];

  // Budget Templates
  budgetTemplates: any[] = [];
  showTemplateModal = false;
  selectedTemplate: any = null;
  templateName = '';

  // Budget Recommendations
  budgetRecommendations: any[] = [];
  months = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' },
    { value: 3, name: 'March' }, { value: 4, name: 'April' },
    { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' },
    { value: 9, name: 'September' }, { value: 10, name: 'October' },
    { value: 11, name: 'November' }, { value: 12, name: 'December' }
  ];

  // Charts
  private pieChart: any = null;
  private barChart: any = null;

  // Form
  formCategory = '';
  formLimitAmount: number | null = null;
  formMonth = new Date().getMonth() + 1;
  formYear = new Date().getFullYear();
  formLoading = false;

  constructor(
    private budgetService: BudgetService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadBudgetTemplates();
    this.generateBudgetRecommendations();
  }

  loadBudgetTemplates(): void {
    const savedTemplates = localStorage.getItem('budgetTemplates');
    if (savedTemplates) {
      this.budgetTemplates = JSON.parse(savedTemplates);
    }
  }

  saveBudgetTemplate(): void {
    if (!this.templateName.trim()) {
      this.toast.error('Please enter a template name');
      return;
    }

    const template = {
      name: this.templateName,
      budgets: this.budgetStatus.map((status: any) => ({
        category: status.category,
        limit: status.limit
      })),
      createdAt: new Date().toISOString()
    };

    this.budgetTemplates.push(template);
    localStorage.setItem('budgetTemplates', JSON.stringify(this.budgetTemplates));
    this.templateName = '';
    this.showTemplateModal = false;
    this.toast.success('Budget template saved successfully');
  }

  applyBudgetTemplate(template: any): void {
    if (confirm(`Apply budget template "${template.name}"? This will replace current budgets.`)) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      let appliedCount = 0;
      template.budgets.forEach((budget: any) => {
        this.budgetService.setBudget({
          category: budget.category,
          limitAmount: budget.limit,
          month: month,
          year: year
        }).subscribe({
          next: () => {
            appliedCount++;
            if (appliedCount === template.budgets.length) {
              this.toast.success('Budget template applied successfully');
              this.loadData();
            }
          },
          error: () => {
            this.toast.error('Failed to apply some budgets');
          }
        });
      });
    }
  }

  deleteBudgetTemplate(index: number): void {
    if (confirm('Are you sure you want to delete this budget template?')) {
      this.budgetTemplates.splice(index, 1);
      localStorage.setItem('budgetTemplates', JSON.stringify(this.budgetTemplates));
      this.toast.success('Budget template deleted successfully');
    }
  }

  generateBudgetRecommendations(): void {
    this.budgetRecommendations = [];

    if (this.budgetStatus.length === 0) return;

    // Analyze spending patterns
    const totalSpent = this.totalSpent;
    const averagePerCategory = totalSpent / this.budgetStatus.length;

    this.budgetStatus.forEach((status: any) => {
    const recommendation: any = {
      category: status.category,
      spent: status.spent,
      currentLimit: status.limit,
      recommendedLimit: 0,
      reason: ''
    };

    // Calculate recommended budget based on spending patterns
    if (status.spent > status.limit) {
      // Over budget - recommend increasing by 20%
      recommendation.recommendedLimit = Math.ceil(status.spent * 1.2);
      recommendation.reason = 'You consistently overspend on this category. Consider increasing your budget.';
    } else if (status.spent < status.limit * 0.5) {
      // Under budget - recommend decreasing by 30%
      recommendation.recommendedLimit = Math.ceil(status.limit * 0.7);
      recommendation.reason = 'You spend much less than allocated. Consider reducing this budget.';
    } else {
      // Within range - recommend slight adjustment based on average
      const deviation = status.spent - averagePerCategory;
      if (Math.abs(deviation) > averagePerCategory * 0.3) {
        recommendation.recommendedLimit = Math.ceil(status.spent * 1.1);
        recommendation.reason = 'Your spending varies significantly from average. Consider adjusting.';
      } else {
        recommendation.recommendedLimit = status.limit;
        recommendation.reason = 'Your budget is well-balanced for your spending habits.';
      }
    }

    this.budgetRecommendations.push(recommendation);
  });
  }

  applyRecommendation(recommendation: any): void {
    const now = new Date();
    this.budgetService.setBudget({
      category: recommendation.category,
      limitAmount: recommendation.recommendedLimit,
      month: now.getMonth() + 1,
      year: now.getFullYear()
    }).subscribe({
      next: () => {
        this.toast.success(`Budget for ${recommendation.category} updated to ₹${recommendation.recommendedLimit}`);
        this.loadData();
      },
      error: () => {
        this.toast.error('Failed to update budget');
      }
    });
  }

  loadData(): void {
    this.loading = true;

    this.budgetService.getBudgets().subscribe({
      next: (data) => {
        this.budgets = data;
        
        // If no budgets exist, create sample budgets
        if (data.length === 0) {
          this.createSampleBudgets();
        }
      }
    });

    this.budgetService.getBudgetStatus().subscribe({
      next: (status) => {
        this.budgetStatus = status;
        this.calculateBudgetSummary(status);
        this.calculateBudgetAlerts(status);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  createSampleBudgets(): void {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    const sampleBudgets = [
      { category: 'Food', limitAmount: 5000 },
      { category: 'Transport', limitAmount: 2000 },
      { category: 'Shopping', limitAmount: 3000 },
      { category: 'Bills', limitAmount: 4000 },
      { category: 'Entertainment', limitAmount: 1500 },
      { category: 'Groceries', limitAmount: 2500 }
    ];

    let createdCount = 0;
    sampleBudgets.forEach(budget => {
      this.budgetService.setBudget({
        category: budget.category,
        limitAmount: budget.limitAmount,
        month: month,
        year: year
      }).subscribe({
        next: () => {
          createdCount++;
          if (createdCount === sampleBudgets.length) {
            this.toast.success('Sample budgets created successfully!');
            this.loadData(); // Reload data after creating budgets
          }
        },
        error: () => {
          console.error(`Failed to create budget for ${budget.category}`);
        }
      });
    });
  }

  refreshData(): void {
    this.loadData();
    this.toast.success('Budget data refreshed');
  }

  calculateBudgetSummary(status: any[]): void {
    this.totalBudget = status.reduce((sum: number, s: any) => sum + s.limit, 0);
    this.totalSpent = status.reduce((sum: number, s: any) => sum + s.spent, 0);
    this.remainingBudget = Math.max(0, this.totalBudget - this.totalSpent);
    this.budgetUtilization = this.totalBudget > 0 ? (this.totalSpent / this.totalBudget) * 100 : 0;

    // Count budget statuses
    this.exceededBudgets = status.filter(s => s.status === 'exceeded').length;
    this.warningBudgets = status.filter(s => s.status === 'warning').length;
    this.safeBudgets = status.filter(s => s.status === 'safe').length;

    // Calculate analytics
    if (status.length > 0) {
      this.averageBudgetPerCategory = this.totalBudget / status.length;
      this.highestBudgetCategory = status.reduce((max: any, s: any) => s.limit > max.limit ? s : max, status[0]);
      this.lowestBudgetCategory = status.reduce((min: any, s: any) => s.limit < min.limit ? s : min, status[0]);
      
      const overspent = status.filter(s => s.spent > s.limit);
      if (overspent.length > 0) {
        this.mostOverspentCategory = overspent.reduce((max: any, s: any) => 
          (s.spent - s.limit) > (max.spent - max.limit) ? s : max, overspent[0]);
      }
    }

    // Create charts after data is loaded with delay for DOM readiness
    setTimeout(() => {
      this.createCharts();
    }, 100);
  }

  createCharts(): void {
    // Destroy existing charts
    if (this.pieChart) {
      this.pieChart.destroy();
    }
    if (this.barChart) {
      this.barChart.destroy();
    }

    // Filter out categories with no budget
    const budgetsWithData = this.budgetStatus.filter(s => s.limit > 0);
    
    if (budgetsWithData.length === 0) {
      return; // Don't create charts if no budget data
    }

    // Create pie chart for budget distribution
    const pieCtx = document.getElementById('budgetPieChart') as HTMLCanvasElement;
    if (pieCtx) {
      this.pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: budgetsWithData.map(s => s.category),
          datasets: [{
            data: budgetsWithData.map(s => s.limit),
            backgroundColor: [
              '#7c3aed', '#a855f7', '#c084fc', '#e9d5ff',
              '#16a34a', '#22c55e', '#4ade80', '#86efac',
              '#ea580c', '#f97316', '#fb923c', '#fdba74',
              '#dc2626', '#ef4444', '#f87171', '#fca5a5'
            ],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: { size: 12 }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => `${context.label}: ₹${context.parsed.toFixed(2)}`
              }
            }
          }
        }
      });
    }

    // Create bar chart for budget vs spending
    const barCtx = document.getElementById('budgetBarChart') as HTMLCanvasElement;
    if (barCtx) {
      this.barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: budgetsWithData.map(s => s.category),
          datasets: [
            {
              label: 'Budget',
              data: budgetsWithData.map(s => s.limit),
              backgroundColor: '#7c3aed',
              borderColor: '#7c3aed',
              borderWidth: 1
            },
            {
              label: 'Spent',
              data: budgetsWithData.map(s => s.spent),
              backgroundColor: '#16a34a',
              borderColor: '#16a34a',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => `₹${value}`
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                padding: 15,
                font: { size: 12 }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => `${context.dataset.label}: ₹${context.parsed.y.toFixed(2)}`
              }
            }
          }
        }
      });
    }
  }

  calculateBudgetAlerts(status: any[]): void {
    this.budgetAlerts = [];

    status.forEach(item => {
      if (item.status === 'exceeded') {
        this.budgetAlerts.push({
          type: 'danger',
          category: item.category,
          message: `${item.category} budget exceeded by ₹${(item.spent - item.limit).toFixed(2)}`,
          percentage: ((item.spent / item.limit) * 100).toFixed(0)
        });
      } else if (item.status === 'warning') {
        const percentage = (item.spent / item.limit) * 100;
        this.budgetAlerts.push({
          type: 'warning',
          category: item.category,
          message: `${item.category} budget ${percentage.toFixed(0)}% used`,
          percentage: percentage.toFixed(0)
        });
      }
    });
  }

  dismissBudgetAlerts(): void {
    this.showBudgetAlerts = false;
  }

  submitBudget(): void {
    if (!this.formCategory || !this.formLimitAmount || !this.formMonth || !this.formYear) {
      this.toast.error('Please fill in all fields');
      return;
    }

    this.formLoading = true;
    this.budgetService.setBudget({
      category: this.formCategory,
      limitAmount: this.formLimitAmount,
      month: this.formMonth,
      year: this.formYear
    }).subscribe({
      next: () => {
        this.toast.success('Budget set successfully');
        this.formLoading = false;
        this.formCategory = '';
        this.formLimitAmount = null;
        this.loadData();
      },
      error: () => {
        this.toast.error('Failed to set budget');
        this.formLoading = false;
      }
    });
  }

  editBudget(budget: any): void {
    this.formCategory = budget.category;
    this.formLimitAmount = budget.limit;
    this.formMonth = budget.month;
    this.formYear = budget.year;
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteBudget(budget: any): void {
    if (confirm(`Are you sure you want to delete the budget for ${budget.category}?`)) {
      // You would need to implement deleteBudget in the service
      this.toast.warning('Budget deletion not implemented yet');
    }
  }

  copyBudget(budget: any): void {
    this.formCategory = budget.category;
    this.formLimitAmount = budget.limit;
    this.formMonth = new Date().getMonth() + 1;
    this.formYear = new Date().getFullYear();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.toast.warning('Budget copied to form. Adjust month/year as needed.');
  }

  getBudgetUtilizationClass(percentage: number): string {
    if (percentage >= 100) return 'exceeded';
    if (percentage >= 80) return 'warning';
    return 'safe';
  }

  getRemainingBudgetColor(remaining: number, limit: number): string {
    const percentage = (remaining / limit) * 100;
    if (percentage <= 0) return 'danger';
    if (percentage <= 20) return 'warning';
    return 'success';
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

  getMonthName(month: number): string {
    return this.months.find(m => m.value === month)?.name || '';
  }

  get years(): number[] {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }

  getBudgetStatusIcon(status: string): string {
    return status === 'exceeded' ? '⚠️' : status === 'warning' ? '🔔' : '✅';
  }

  getBudgetStatusColor(status: string): string {
    return status === 'exceeded' ? 'danger' : status === 'warning' ? 'warning' : 'success';
  }

  getBudgetHealthScore(): number {
    if (this.budgetStatus.length === 0) return 0;

    let score = 0;
    this.budgetStatus.forEach((status: any) => {
      const percentage = (status.spent / status.limit) * 100;
      if (percentage <= 70) {
        score += 100;
      } else if (percentage <= 90) {
        score += 70;
      } else if (percentage <= 100) {
        score += 40;
      } else {
        score += 10;
      }
    });

    return Math.round(score / this.budgetStatus.length);
  }

  getBudgetHealthLabel(): string {
    const score = this.getBudgetHealthScore();
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  }

  getBudgetHealthColor(): string {
    const score = this.getBudgetHealthScore();
    if (score >= 80) return 'success';
    if (score >= 60) return 'primary';
    if (score >= 40) return 'warning';
    return 'danger';
  }

  getSavingsPotential(): number {
    let potential = 0;
    this.budgetRecommendations.forEach((rec: any) => {
      if (rec.recommendedLimit < rec.currentLimit) {
        potential += rec.currentLimit - rec.recommendedLimit;
      }
    });
    return potential;
  }

  formatAmount(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }
}

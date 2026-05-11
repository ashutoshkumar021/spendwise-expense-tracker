import { Component, OnInit } from '@angular/core';
import { IncomeService } from '../../services/income.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-income',
  templateUrl: './income.component.html',
  styleUrls: ['./income.component.css']
})
export class IncomeComponent implements OnInit {
  income: any[] = [];
  loading = true;
  showForm = false;
  editingIncome: any = null;
  deleteConfirmId: string | null = null;

  // Privacy toggles per card
  showTotalIncome = false;
  showAverageIncome = false;
  showHighestIncome = false;
  showTableAmounts = false;

  categories = [
    'Salary',
    'Freelance',
    'Investments',
    'Business',
    'Gifts',
    'Refunds',
    'Other'
  ];

  months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  // Filters
  filterCategory = '';
  filterMonth = '';
  filterYear = '';

  // Analytics
  totalIncome = 0;
  averageIncome = 0;
  highestIncome: any = null;
  categoryTotals: any = {};
  incomeTrend = 'neutral';
  incomeChange = 0;

  // Form
  formTitle = '';
  formAmount: number | null = null;
  formCategory = '';
  formDate = '';
  formDescription = '';
  formTags: string[] = [];
  formTagInput = '';
  formLoading = false;

  constructor(
    private incomeService: IncomeService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadIncome();
    // Load privacy settings from localStorage
    const savedPrivacy = localStorage.getItem('incomePrivacySettings');
    if (savedPrivacy) {
      const settings = JSON.parse(savedPrivacy);
      this.showTotalIncome = settings.showTotalIncome || false;
      this.showAverageIncome = settings.showAverageIncome || false;
      this.showHighestIncome = settings.showHighestIncome || false;
      this.showTableAmounts = settings.showTableAmounts || false;
    }
  }

  loadIncome(): void {
    this.loading = true;
    const filters: any = {};
    if (this.filterCategory) filters.category = this.filterCategory;
    if (this.filterMonth && this.filterYear) {
      filters.month = parseInt(this.filterMonth);
      filters.year = parseInt(this.filterYear);
    }

    this.incomeService.getIncome(filters).subscribe({
      next: (data) => {
        this.income = data;
        this.calculateAnalytics();
        this.loading = false;
      },
      error: () => {
        this.toast.error('Failed to load income');
        this.loading = false;
      }
    });
  }

  calculateAnalytics(): void {
    if (this.income.length === 0) {
      this.totalIncome = 0;
      this.averageIncome = 0;
      this.highestIncome = null;
      this.categoryTotals = {};
      return;
    }

    // Total income
    this.totalIncome = this.income.reduce((sum, inc) => sum + inc.amount, 0);

    // Average income
    this.averageIncome = this.totalIncome / this.income.length;

    // Highest income
    this.highestIncome = this.income.reduce((max, inc) => 
      inc.amount > max.amount ? inc : max, this.income[0]);

    // Category totals
    this.categoryTotals = {};
    this.income.forEach(inc => {
      if (!this.categoryTotals[inc.category]) {
        this.categoryTotals[inc.category] = 0;
      }
      this.categoryTotals[inc.category] += inc.amount;
    });
  }

  clearFilters(): void {
    this.filterCategory = '';
    this.filterMonth = '';
    this.filterYear = '';
    this.loadIncome();
  }

  openAddForm(): void {
    this.editingIncome = null;
    this.formTitle = '';
    this.formAmount = null;
    this.formCategory = '';
    this.formDate = new Date().toISOString().split('T')[0];
    this.formDescription = '';
    this.formTags = [];
    this.formTagInput = '';
    this.showForm = true;
  }

  openEditForm(income: any): void {
    this.editingIncome = income;
    this.formTitle = income.title;
    this.formAmount = income.amount;
    this.formCategory = income.category;
    this.formDate = new Date(income.date).toISOString().split('T')[0];
    this.formDescription = income.description || '';
    this.formTags = income.tags || [];
    this.formTagInput = '';
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingIncome = null;
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

    if (this.editingIncome) {
      this.incomeService.updateIncome(this.editingIncome._id, data).subscribe({
        next: () => {
          this.toast.success('Income updated successfully');
          this.formLoading = false;
          this.closeForm();
          this.loadIncome();
        },
        error: () => {
          this.toast.error('Failed to update income');
          this.formLoading = false;
        }
      });
    } else {
      this.incomeService.addIncome(data).subscribe({
        next: () => {
          this.toast.success('Income added successfully');
          this.formLoading = false;
          this.closeForm();
          this.loadIncome();
        },
        error: () => {
          this.toast.error('Failed to add income');
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

  deleteIncome(id: string): void {
    this.incomeService.deleteIncome(id).subscribe({
      next: () => {
        this.toast.success('Income deleted successfully');
        this.deleteConfirmId = null;
        this.loadIncome();
      },
      error: () => {
        this.toast.error('Failed to delete income');
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
    const icons: any = { 
      Salary: '💰', 
      Freelance: '💼', 
      Investments: '📈', 
      Business: '🏢', 
      Gifts: '🎁', 
      Refunds: '↩️', 
      Other: '📦' 
    };
    return icons[category] || '📦';
  }

  getCategoryPercentage(category: string): number {
    if (this.totalIncome === 0) return 0;
    const categoryTotal = this.categoryTotals[category] || 0;
    return ((categoryTotal / this.totalIncome) * 100).toFixed(1) as any;
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

  getIncomeTags(income: any): string[] {
    return income.tags || [];
  }

  get years(): number[] {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }

  togglePrivacy(field: string): void {
    switch(field) {
      case 'total':
        this.showTotalIncome = !this.showTotalIncome;
        break;
      case 'average':
        this.showAverageIncome = !this.showAverageIncome;
        break;
      case 'highest':
        this.showHighestIncome = !this.showHighestIncome;
        break;
      case 'table':
        this.showTableAmounts = !this.showTableAmounts;
        break;
    }
    this.savePrivacySettings();
  }

  savePrivacySettings(): void {
    const settings = {
      showTotalIncome: this.showTotalIncome,
      showAverageIncome: this.showAverageIncome,
      showHighestIncome: this.showHighestIncome,
      showTableAmounts: this.showTableAmounts
    };
    localStorage.setItem('incomePrivacySettings', JSON.stringify(settings));
  }

  formatAmount(amount: number, show: boolean): string {
    if (!show) {
      return '••••••';
    }
    return `₹${amount.toFixed(2)}`;
  }

  formatTotal(amount: number, show: boolean): string {
    if (!show) {
      return '••••••';
    }
    return `₹${amount.toFixed(2)}`;
  }
}

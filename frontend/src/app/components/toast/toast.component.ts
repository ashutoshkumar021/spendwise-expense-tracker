import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container">
      <div *ngFor="let t of toasts" class="toast" [ngClass]="'toast-' + t.type" [@fadeInOut]>
        <span class="toast-icon">{{ t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : '⚠️' }}</span>
        <span class="toast-message">{{ t.message }}</span>
      </div>
    </div>
  `,
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ],
  styles: [`
    .toast-container {
      position: fixed;
      top: 80px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .toast {
      padding: 16px 24px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-weight: 600;
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
      animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1), fadeOut 0.4s ease 2.6s forwards;
      min-width: 300px;
      position: relative;
      overflow: hidden;
    }
    .toast::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
      transition: left 0.5s ease;
    }
    .toast:hover::before {
      left: 100%;
    }
    .toast-icon {
      font-size: 18px;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }
    .toast-success {
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #059669 !important;
      box-shadow: 0 10px 40px rgba(34, 197, 94, 0.2);
    }
    .toast-error {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #dc2626 !important;
      box-shadow: 0 10px 40px rgba(239, 68, 68, 0.2);
    }
    .toast-warning {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #d97706 !important;
      box-shadow: 0 10px 40px rgba(245, 158, 11, 0.2);
    }
    @keyframes slideIn {
      from { transform: translateX(120%) scale(0.9); opacity: 0; }
      to { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes fadeOut {
      to { opacity: 0; transform: translateX(50%) scale(0.9); }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub!: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.sub = this.toastService.toast$.subscribe(toast => {
      this.toasts.push(toast);
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== toast.id);
      }, 3000);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}

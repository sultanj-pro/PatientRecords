import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-collapsible-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="collapsible-section" [class.expanded]="isExpanded">
      <button 
        class="section-header" 
        (click)="toggleSection()"
        [attr.aria-expanded]="isExpanded"
        [attr.aria-controls]="'section-' + sectionId">
        <span class="icon" [@rotateIcon]="isExpanded ? 'expanded' : 'collapsed'">
          ▶
        </span>
        <span class="title">{{ title }}</span>
        <span class="badge" *ngIf="badgeCount !== null && badgeCount > 0" [class]="'badge-' + badgeColor">
          {{ badgeCount }}
        </span>
      </button>
      <div 
        class="section-content" 
        [@slideDown]="isExpanded ? 'expanded' : 'collapsed'"
        [attr.id]="'section-' + sectionId">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .collapsible-section {
      margin-bottom: 16px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .section-header {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      font-weight: 600;
      transition: all 0.3s ease;
      font-family: inherit;
    }

    .section-header:hover {
      background: linear-gradient(135deg, #5568d3 0%, #6a3f95 100%);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
    }

    .section-header:focus {
      outline: 2px solid white;
      outline-offset: -4px;
    }

    .icon {
      display: inline-flex;
      transition: transform 0.3s ease;
      font-size: 12px;
    }

    .title {
      flex: 1;
      text-align: left;
    }

    .badge {
      background: rgba(255, 255, 255, 0.3);
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: auto;
    }

    .badge-info {
      background: rgba(149, 165, 207, 0.5);
    }

    .badge-warning {
      background: rgba(255, 193, 7, 0.5);
    }

    .badge-danger {
      background: rgba(244, 67, 54, 0.5);
    }

    .badge-success {
      background: rgba(76, 175, 80, 0.5);
    }

    .section-content {
      background: white;
      overflow: hidden;
    }

    .section-content[hidden] {
      display: none;
    }

    .collapsible-section.expanded .section-header {
      border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    }
  `],
  animations: [
    trigger('rotateIcon', [
      state('collapsed', style({
        transform: 'rotate(0deg)'
      })),
      state('expanded', style({
        transform: 'rotate(90deg)'
      })),
      transition('collapsed <=> expanded', animate('300ms ease-in-out'))
    ]),
    trigger('slideDown', [
      state('collapsed', style({
        height: '0',
        overflow: 'hidden',
        opacity: '0'
      })),
      state('expanded', style({
        height: '*',
        overflow: 'visible',
        opacity: '1'
      })),
      transition('collapsed <=> expanded', animate('300ms ease-in-out'))
    ])
  ]
})
export class CollapsibleSectionComponent implements OnInit {
  @Input() title: string = 'Section';
  @Input() sectionId: string = 'section-' + Math.random().toString(36).substr(2, 9);
  @Input() isExpanded: boolean = true;
  @Input() badgeCount: number | null = null;
  @Input() badgeColor: 'info' | 'warning' | 'danger' | 'success' = 'info';

  ngOnInit(): void {
    // Load state from sessionStorage if available
    const savedState = sessionStorage.getItem(`section-${this.sectionId}`);
    if (savedState !== null) {
      this.isExpanded = JSON.parse(savedState);
    }
  }

  toggleSection(): void {
    this.isExpanded = !this.isExpanded;
    // Save state to sessionStorage
    sessionStorage.setItem(`section-${this.sectionId}`, JSON.stringify(this.isExpanded));
  }
}

import { Component } from '@angular/core';

@Component({
  selector: 'app-vitals',
  standalone: true,
  template: `
    <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif; background: #fce4ec; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1 style="color: #c2185b; font-size: 48px; margin: 0 0 20px 0;">Hello from Vitals!</h1>
      <p style="color: #424242; font-size: 18px; margin: 0 0 10px 0;">This is the vitals micro-frontend module</p>
      <p style="color: #c2185b; font-weight: bold; font-size: 20px; margin: 0;">✓ Module is rendering successfully!</p>
    </div>
  `,
  styles: []
})
export class VitalsComponent {
  constructor() { }
}

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

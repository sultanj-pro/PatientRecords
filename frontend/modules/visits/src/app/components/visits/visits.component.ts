import { Component } from '@angular/core';

@Component({
  selector: 'app-visits',
  standalone: true,
  template: `
    <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif; background: #e8f5e9; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1 style="color: #388e3c; font-size: 48px; margin: 0 0 20px 0;">Hi from the visits module</h1>
      <p style="color: #424242; font-size: 18px; margin: 0 0 10px 0;">This is the visits micro-frontend module</p>
      <p style="color: #388e3c; font-weight: bold; font-size: 20px; margin: 0;">✓ Module is rendering successfully!</p>
    </div>
  `,
  styles: []
})
export class VisitsComponent {
  constructor() { }
}

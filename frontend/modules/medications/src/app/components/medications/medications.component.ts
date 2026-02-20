import { Component } from '@angular/core';

@Component({
  selector: 'app-medications',
  standalone: true,
  template: `
    <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif; background: #f0f0f0; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1 style="color: #333; font-size: 48px; margin: 0 0 20px 0;">Hi from the medication module</h1>
      <p style="color: #666; font-size: 18px; margin: 0 0 10px 0;">This is the medications micro-frontend module</p>
      <p style="color: green; font-weight: bold; font-size: 20px; margin: 0;">✓ Module is rendering successfully!</p>
    </div>
  `,
  styles: []
})
export class MedicationsComponent {
  constructor() { }
}

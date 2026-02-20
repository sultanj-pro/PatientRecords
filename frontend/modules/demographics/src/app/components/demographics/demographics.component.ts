import { Component } from '@angular/core';

@Component({
  selector: 'app-demographics',
  standalone: true,
  template: `
    <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif; background: #e3f2fd; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1 style="color: #1976d2; font-size: 48px; margin: 0 0 20px 0;">Hi from the demographics module</h1>
      <p style="color: #424242; font-size: 18px; margin: 0 0 10px 0;">This is the demographics micro-frontend module</p>
      <p style="color: #1976d2; font-weight: bold; font-size: 20px; margin: 0;">✓ Module is rendering successfully!</p>
    </div>
  `,
  styles: []
})
export class DemographicsComponent {
  constructor() { }
}

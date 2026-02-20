import { Component } from '@angular/core';

@Component({
  selector: 'app-labs',
  standalone: true,
  template: `
    <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif; background: #fff3e0; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1 style="color: #ef6c00; font-size: 48px; margin: 0 0 20px 0;">Hi from the labs module</h1>
      <p style="color: #424242; font-size: 18px; margin: 0 0 10px 0;">This is the labs micro-frontend module</p>
      <p style="color: #ef6c00; font-weight: bold; font-size: 20px; margin: 0;">✓ Module is rendering successfully!</p>
    </div>
  `,
  styles: []
})
export class LabsComponent {
  constructor() { }
}


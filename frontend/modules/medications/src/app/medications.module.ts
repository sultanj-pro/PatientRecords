import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MedicationsComponent } from './components/medications/medications.component';
import { MEDICATIONS_ROUTES } from './medications.routes';

@NgModule({
  declarations: [
    MedicationsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild(MEDICATIONS_ROUTES)
  ],
  exports: [
    MedicationsComponent
  ]
})
export class MedicationsModule { }

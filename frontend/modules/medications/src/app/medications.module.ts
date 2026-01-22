import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MedicationsComponent } from './components/medications/medications.component';

@NgModule({
  declarations: [
    MedicationsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  exports: [
    MedicationsComponent
  ]
})
export class MedicationsModule { }

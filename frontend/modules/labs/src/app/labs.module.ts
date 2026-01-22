import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { LabsComponent } from './components/labs/labs.component';

@NgModule({
  declarations: [
    LabsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  exports: [
    LabsComponent
  ]
})
export class LabsModule { }

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { VisitsComponent } from './components/visits/visits.component';

@NgModule({
  declarations: [
    VisitsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  exports: [
    VisitsComponent
  ]
})
export class VisitsModule { }

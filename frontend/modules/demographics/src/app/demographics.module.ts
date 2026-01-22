import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { DemographicsComponent } from './components/demographics/demographics.component';

@NgModule({
  declarations: [
    DemographicsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  exports: [
    DemographicsComponent
  ]
})
export class DemographicsModule { }

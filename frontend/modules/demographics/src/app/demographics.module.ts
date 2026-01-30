import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { DemographicsComponent } from './components/demographics/demographics.component';
import { DEMOGRAPHICS_ROUTES } from './demographics.routes';

@NgModule({
  declarations: [
    DemographicsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild(DEMOGRAPHICS_ROUTES)
  ],
  exports: [
    DemographicsComponent
  ]
})
export class DemographicsModule { }

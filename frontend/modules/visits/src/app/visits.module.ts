import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { VisitsComponent } from './components/visits/visits.component';
import { VISITS_ROUTES } from './visits.routes';

@NgModule({
  declarations: [
    VisitsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild(VISITS_ROUTES)
  ],
  exports: [
    VisitsComponent
  ]
})
export class VisitsModule { }

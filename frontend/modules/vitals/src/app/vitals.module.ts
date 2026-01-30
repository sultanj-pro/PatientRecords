import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { VitalsComponent } from './components/vitals/vitals.component';
import { VITALS_ROUTES } from './vitals.routes';

@NgModule({
  declarations: [
    VitalsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild(VITALS_ROUTES)
  ],
  exports: [
    VitalsComponent
  ]
})
export class VitalsModule { }

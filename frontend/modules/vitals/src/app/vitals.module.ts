import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { VitalsComponent } from './components/vitals/vitals.component';

@NgModule({
  declarations: [
    VitalsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule
  ],
  exports: [
    VitalsComponent
  ]
})
export class VitalsModule { }

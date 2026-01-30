import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { LabsComponent } from './components/labs/labs.component';
import { LABS_ROUTES } from './labs.routes';

@NgModule({
  declarations: [
    LabsComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    RouterModule.forChild(LABS_ROUTES)
  ],
  exports: [
    LabsComponent
  ]
})
export class LabsModule { }

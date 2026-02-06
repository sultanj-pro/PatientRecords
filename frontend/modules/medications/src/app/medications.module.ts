import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { MedicationsComponent } from './components/medications/medications.component';

@NgModule({
  declarations: [
    MedicationsComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  bootstrap: [MedicationsComponent]
})
export class MedicationsModule { }

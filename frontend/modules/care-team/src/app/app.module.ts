import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { CareTeamModule } from './care-team/care-team.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    CareTeamModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }

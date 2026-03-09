import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { CareTeamComponent } from './care-team.component';
import { CareTeamService } from './care-team.service';
export { CARE_TEAM_ROUTES } from './care-team.routes';

@NgModule({
  declarations: [CareTeamComponent],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [CareTeamService],
  exports: [CareTeamComponent]
})
export class CareTeamModule { }

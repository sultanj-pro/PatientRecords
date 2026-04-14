import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AdminComponent } from './admin.component';
import { JwtInterceptor } from '../core/interceptors/jwt.interceptor';
export { ADMIN_ROUTES } from './admin.routes';

@NgModule({
  declarations: [AdminComponent],
  imports: [CommonModule, HttpClientModule, FormsModule],
  providers: [{ provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }],
  exports: [AdminComponent]
})
export class AdminModule { }

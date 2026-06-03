import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { UploadImagesComponent } from './pages/upload-images/upload-images.component';
import { LoginComponent } from './pages/login/login.component';
import { SelfOrderComponent } from './pages/self-order/self-order.component';
import { AdminLayoutComponent } from './pages/admin-layout/admin-layout.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'order',
    component: SelfOrderComponent
  },
  {
    path: 'upload',
    component: UploadImagesComponent
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'orders', pathMatch: 'full' },
      { path: 'menu', component: SelfOrderComponent },
      { path: 'orders', component: OrdersComponent }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { UploadImagesComponent } from './pages/upload-images/upload-images.component'; // 👈 adjust path if needed
import { LoginComponent } from './pages/login/login.component';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard.component';
import { SelfOrderComponent } from './pages/self-order/self-order.component';

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
    path: 'admin/dashboard',
    component: AdminDashboardComponent
  },
  {
    path: 'upload',
    component: UploadImagesComponent
  },
  {
    path: 'order',
    component: SelfOrderComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
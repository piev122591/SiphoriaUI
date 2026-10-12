import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { authGuard } from './guards/auth.guard';

// Pages are lazy-loaded so the first visit only downloads what it needs
// (e.g. the QZ Tray printer libraries load with the menu/orders pages, not on Home).
export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'order',
    loadComponent: () =>
      import('./pages/self-order/self-order.component').then(m => m.SelfOrderComponent)
  },
  {
    path: 'upload',
    loadComponent: () =>
      import('./pages/upload-images/upload-images.component').then(m => m.UploadImagesComponent)
  },
  // Phone-friendly restock flow for inventory QR labels (outside the admin sidebar layout)
  {
    path: 'restock',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/restock/restock-scan.component').then(m => m.RestockScanComponent)
  },
  {
    path: 'restock/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/restock/restock.component').then(m => m.RestockComponent)
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'orders', pathMatch: 'full' },
      {
        path: 'menu',
        loadComponent: () =>
          import('./pages/self-order/self-order.component').then(m => m.SelfOrderComponent)
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/orders/orders.component').then(m => m.OrdersComponent)
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/admin-products/admin-products.component').then(m => m.AdminProductsComponent)
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./pages/admin-inventory/admin-inventory.component').then(m => m.AdminInventoryComponent)
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/admin-reports/admin-reports.component').then(m => m.AdminReportsComponent)
      },
      {
        path: 'export',
        loadComponent: () =>
          import('./pages/admin-export/admin-export.component').then(m => m.AdminExportComponent)
      },
      {
        path: 'devtool',
        loadComponent: () =>
          import('./pages/admin-devtool/admin-devtool.component').then(m => m.AdminDevtoolComponent)
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];

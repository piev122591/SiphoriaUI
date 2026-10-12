import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  if (token) return true;
  // Remember where the user was going (e.g. a scanned restock QR link)
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

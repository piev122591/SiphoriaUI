import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { NavigationError, provideRouter, withNavigationErrorHandler } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

// After a new deploy, an already-open tab may ask for page files that no longer
// exist. Do a full reload of the target page once instead of leaving it stuck.
function reloadOnChunkLoadError(error: NavigationError): void {
  const message = String(error.error?.message ?? error.error ?? '');
  const isChunkError = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(message);
  if (!isChunkError) return;

  const key = 'chunk-reload-at';
  let last = 0;
  try { last = Number(sessionStorage.getItem(key)) || 0; } catch {}
  if (Date.now() - last < 10000) return; // already reloaded just now; avoid a loop
  try { sessionStorage.setItem(key, String(Date.now())); } catch {}
  window.location.assign(error.url);
}

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideStorage, getStorage } from '@angular/fire/storage';

import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Router
    provideRouter(routes, withNavigationErrorHandler(reloadOnChunkLoadError)),

    // HTTP Client (for API calls)
    provideHttpClient(),

    // Firebase
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideStorage(() => getStorage())
  ]
};
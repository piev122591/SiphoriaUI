import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'siphoria-ui';
  showNavbar = true;
  isLoggedIn = false;
  isNavigating = false;

  constructor(private router: Router) {
    this.router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        this.isNavigating = true;
      } else if (e instanceof NavigationEnd) {
        this.isNavigating = false;
        const isAdmin = e.urlAfterRedirects.startsWith('/admin');
        this.showNavbar = !isAdmin;
        this.isLoggedIn = !!localStorage.getItem('token');
      } else if (e instanceof NavigationCancel || e instanceof NavigationError) {
        this.isNavigating = false;
      }
    });
  }
}

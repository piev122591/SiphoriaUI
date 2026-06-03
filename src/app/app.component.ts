import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

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

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      const isAdmin = e.urlAfterRedirects.startsWith('/admin');
      this.showNavbar = !isAdmin;
      this.isLoggedIn = !!localStorage.getItem('token');
    });
  }
}

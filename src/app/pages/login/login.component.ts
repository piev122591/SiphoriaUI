import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
   selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
   this.loginForm = this.fb.group({
  username: ['', Validators.required],
  password: ['', Validators.required]
});
  }

 onLogin() {
  if (this.loginForm.invalid) return;

  this.isLoading = true;
  this.errorMessage = null;

  const credentials = this.loginForm.value;

  console.log(credentials);
  /*
    {
      username: 'admin',
      password: '1234'
    }
  */

  // Example API call
  this.http.post('https://siphoriabackend-production.up.railway.app/users/login', credentials)
    .subscribe({
      next: (response: any) => {
        localStorage.setItem('token', response.token);
        this.isLoading = false;
        this.router.navigate(['/admin/dashboard']);
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Invalid username or password';
      }
    });
}
}
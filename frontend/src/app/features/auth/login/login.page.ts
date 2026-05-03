import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MacIconComponent } from '../../shared/mac-icon/mac-icon.component';

type Panel = 'login' | 'forgot' | 'reset';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MacIconComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);

  readonly activePanel = signal<Panel>('login');
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly loading = signal(false);
  readonly showPassword = signal(false);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly forgotForm = this.fb.group({
    tenantIdentifier: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
  });

  readonly resetForm = this.fb.group({
    token: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  setPanel(panel: Panel): void {
    this.activePanel.set(panel);
    this.error.set(null);
    this.info.set(null);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  login(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const { email, password } = this.loginForm.getRawValue();
    this.auth.login(String(email), String(password)).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'Credenciales inválidas.');
      },
    });
  }

  forgotPassword(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const { tenantIdentifier, email } = this.forgotForm.getRawValue();
    this.auth.forgotPassword(String(email), String(tenantIdentifier)).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.info.set(
          response.resetToken
            ? `Token de prueba: ${response.resetToken}`
            : response.message || 'Si el usuario existe, se envió recuperación.'
        );
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'No se pudo iniciar recuperación.');
      },
    });
  }

  resetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    const { token, newPassword } = this.resetForm.getRawValue();
    this.auth.resetPassword(String(token), String(newPassword)).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.info.set(response.message || 'Contraseña actualizada.');
        this.activePanel.set('login');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'No se pudo restablecer contraseña.');
      },
    });
  }
}

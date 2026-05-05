import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { STORAGE_KEYS } from '../api.constants';
import { AuthUser, LoginResponse } from '../api.models';
import { ApiService } from './api.service';

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  resetToken?: string;
  expiresAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(localStorage.getItem(STORAGE_KEYS.token));
  private readonly userSignal = signal<AuthUser | null>(this.readStoredUser());

  readonly token = this.tokenSignal.asReadonly();
  readonly user = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.tokenSignal() && !!this.userSignal());
  readonly role = computed(() => this.userSignal()?.role ?? null);

  constructor(private readonly api: ApiService) {}

  login(email: string, password: string, tenantIdentifier: string): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/auth/login', { email, password, tenantIdentifier }).pipe(
      tap((response) => {
        this.tokenSignal.set(response.token);
        this.userSignal.set(response.user);
        localStorage.setItem(STORAGE_KEYS.token, response.token);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(response.user));
      }),
    );
  }

  forgotPassword(email: string, tenantIdentifier: string): Observable<ForgotPasswordResponse> {
    return this.api.post<ForgotPasswordResponse>('/auth/forgot-password', {
      email,
      tenantIdentifier,
    });
  }

  resetPassword(
    token: string,
    newPassword: string,
  ): Observable<{ success: boolean; message: string }> {
    return this.api.post<{ success: boolean; message: string }>('/auth/reset-password', {
      token,
      newPassword,
    });
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  }

  private readStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.user);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserRole } from '../../../core/api.models';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  roles: UserRole[];
}

@Component({
  selector: 'app-shell-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.page.html',
  styleUrl: './shell.page.css',
})
export class ShellPage {
  readonly menuOpen = signal(false);

  private readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
    { label: 'Tenants', route: '/tenants', roles: ['superadmin'] },
    { label: 'Usuarios', route: '/users', roles: ['superadmin', 'admin'] },
    { label: 'Unidades', route: '/units', roles: ['superadmin', 'admin', 'residente'] },
    { label: 'Residentes', route: '/residents', roles: ['superadmin', 'admin'] },
    { label: 'Cargos', route: '/charges', roles: ['superadmin', 'admin'] },
    { label: 'Pagos', route: '/payments', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
    { label: 'Mantenimiento', route: '/maintenance', roles: ['superadmin', 'admin', 'residente'] },
    { label: 'Reservaciones', route: '/reservations', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
  ];

  readonly availableItems = computed(() => {
    const role = this.auth.role();
    if (!role) {
      return [];
    }
    return this.navItems.filter((item) => item.roles.includes(role));
  });

  constructor(
    readonly auth: AuthService,
    private readonly router: Router
  ) {}

  toggleMenu(): void {
    this.menuOpen.update((current) => !current);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

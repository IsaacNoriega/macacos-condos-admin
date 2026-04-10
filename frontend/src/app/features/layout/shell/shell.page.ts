import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserRole } from '../../../core/api.models';
import { AuthService } from '../../../core/services/auth.service';

interface NavItem {
  label: string;
  route: string;
  roles: UserRole[];
  icon: keyof typeof NAV_ICONS;
  hint?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_ICONS = {
  dashboard: 'dashboard',
  tenants: 'tenants',
  residents: 'residents',
  users: 'users',
  units: 'units',
  amenities: 'amenities',
  reservations: 'reservations',
  maintenance: 'maintenance',
  charges: 'charges',
  payments: 'payments',
} as const;

@Component({
  selector: 'app-shell-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.page.html',
  styleUrl: './shell.page.css',
})
export class ShellPage {
  readonly menuOpen = signal(false);
  readonly sidebarCollapsed = signal(false);

  private readonly navSections: NavSection[] = [
    {
      title: 'Principal',
      items: [{ label: 'Inicio', hint: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['superadmin', 'admin', 'residente', 'familiar'] }],
    },
    {
      title: 'Personas',
      items: [
        { label: 'Inquilinos', hint: 'Tenants', icon: 'tenants', route: '/tenants', roles: ['superadmin'] },
        { label: 'Residentes', icon: 'residents', route: '/residents', roles: ['superadmin', 'admin'] },
        { label: 'Usuarios', hint: 'Admin', icon: 'users', route: '/users', roles: ['superadmin', 'admin'] },
      ],
    },
    {
      title: 'Propiedad y Gestión',
      items: [
        { label: 'Unidades', icon: 'units', route: '/units', roles: ['superadmin', 'admin'] },
        { label: 'Amenidades', icon: 'amenities', route: '/amenities', roles: ['superadmin', 'admin'] },
        { label: 'Reservaciones', icon: 'reservations', route: '/reservations', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
        { label: 'Mantenimiento', icon: 'maintenance', route: '/maintenance', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
      ],
    },
    {
      title: 'Finanzas',
      items: [
        { label: 'Cargos', icon: 'charges', route: '/charges', roles: ['superadmin', 'admin'] },
        { label: 'Pagos', icon: 'payments', route: '/payments', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
      ],
    },
  ];

  readonly navIconPaths: Record<keyof typeof NAV_ICONS, string> = {
    dashboard: 'M4 11.5V20h6v-5h4v5h6v-8.5L12 4 4 11.5Z',
    tenants: 'M4 20h16M6 20v-7m4 7v-7m4 7v-7m4 7v-7M5 13h14L12 5 5 13Z',
    residents: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m16 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    users: 'M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 20a6 6 0 0 1 12 0M19 8h3m-1.5-1.5v3',
    units: 'M3 11.5 12 4l9 7.5V20H3v-8.5ZM9 20v-5h6v5',
    amenities: 'M12 3.5 14.7 9.1l6.1.9-4.4 4.3 1 6.1-5.4-2.8-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3.5Z',
    reservations: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
    maintenance: 'M14.7 6.3a4 4 0 0 0-5.65 5.65l-5.2 5.2a1.5 1.5 0 0 0 2.12 2.12l5.2-5.2a4 4 0 0 0 5.65-5.65l-2.12 2.12-2.12-2.12 2.12-2.12Z',
    charges: 'M8 7h8M8 12h8M8 17h8M5 7h.01M5 12h.01M5 17h.01',
    payments: 'M3 7h18v10H3zM3 10h18M7 14h4',
  };

  readonly availableSections = computed(() => {
    const role = this.auth.role();
    if (!role) {
      return [];
    }
    return this.navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(role)),
      }))
      .filter((section) => section.items.length > 0);
  });

  readonly userInitials = computed(() => {
    const name = this.auth.user()?.name?.trim() || '';
    if (!name) {
      return 'AD';
    }

    const parts = name.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
    return initials || name.slice(0, 2).toUpperCase();
  });

  iconPath(icon: keyof typeof NAV_ICONS): string {
    return this.navIconPaths[icon];
  }

  constructor(
    readonly auth: AuthService,
    private readonly router: Router
  ) {}

  toggleMenu(): void {
    this.menuOpen.update((current) => !current);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((current) => !current);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

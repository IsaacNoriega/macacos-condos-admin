import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserRole } from '../../../core/api.models';
import { AuthService } from '../../../core/services/auth.service';
import { MacIconComponent, MacIconName } from '../../shared/mac-icon/mac-icon.component';

interface NavItem {
  label: string;
  route: string;
  roles: UserRole[];
  icon: MacIconName;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
  roles?: UserRole[];
}

@Component({
  selector: 'app-shell-page',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, MacIconComponent],
  templateUrl: './shell.page.html',
  styleUrl: './shell.page.css',
})
export class ShellPage implements OnInit {
  readonly menuOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly darkMode = signal(false);
  readonly userMenuOpen = signal(false);

  private readonly footerRef = viewChild<ElementRef<HTMLElement>>('footerRef');

  private readonly navSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
        { label: 'Residentes', icon: 'users',    route: '/residents', roles: ['superadmin', 'admin'] },
        { label: 'Unidades',   icon: 'building', route: '/units',     roles: ['superadmin', 'admin', 'residente'] },
      ],
    },
    {
      title: 'Finanzas',
      items: [
        { label: 'Cargos', icon: 'receipt', route: '/charges',  roles: ['superadmin', 'admin'] },
        { label: 'Pagos',  icon: 'card',    route: '/payments', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
      ],
    },
    {
      title: 'Operación',
      items: [
        { label: 'Mantenimiento', icon: 'wrench',   route: '/maintenance',  roles: ['superadmin', 'admin', 'residente', 'familiar'] },
        { label: 'Reservaciones', icon: 'calendar', route: '/reservations', roles: ['superadmin', 'admin', 'residente', 'familiar'] },
        { label: 'Amenidades',    icon: 'sparkle',  route: '/amenities',    roles: ['superadmin', 'admin'] },
      ],
    },
    {
      title: 'Administración',
      roles: ['superadmin'],
      items: [
        { label: 'Condominios', icon: 'shield', route: '/tenants', roles: ['superadmin'] },
      ],
    },
    {
      title: 'Sistema',
      roles: ['superadmin', 'admin'],
      items: [
        { label: 'Usuarios', icon: 'user', route: '/users', roles: ['superadmin', 'admin'] },
      ],
    },
  ];

  readonly availableSections = computed(() => {
    const role = this.auth.role();
    if (!role) return [];
    return this.navSections
      .filter((section) => !section.roles || section.roles.includes(role))
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(role)),
      }))
      .filter((section) => section.items.length > 0);
  });

  readonly userInitials = computed(() => {
    const name = this.auth.user()?.name?.trim() || '';
    if (!name) return 'AD';
    const parts = name.split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
    return initials || name.slice(0, 2).toUpperCase();
  });

  readonly roleLabel = computed(() => {
    const role = this.auth.role();
    if (!role) return '';
    const map: Record<UserRole, string> = {
      superadmin: 'Super Admin',
      admin: 'Administrador',
      residente: 'Residente',
      familiar: 'Familiar',
    };
    return map[role];
  });

  constructor(
    readonly auth: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('macacos-theme');
    const isDark = savedTheme === 'dark';
    this.darkMode.set(isDark);
    this.applyTheme(isDark, false);
  }

  toggleTheme(): void {
    const newValue = !this.darkMode();
    this.darkMode.set(newValue);
    this.applyTheme(newValue, true);
    localStorage.setItem('macacos-theme', newValue ? 'dark' : 'light');
  }

  private applyTheme(isDark: boolean, animate: boolean): void {
    const html = document.documentElement;
    if (animate) {
      html.classList.add('theme-transitioning');
      setTimeout(() => html.classList.remove('theme-transitioning'), 600);
    }
    if (isDark) {
      html.setAttribute('data-theme', 'dark');
    } else {
      html.removeAttribute('data-theme');
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((current) => !current);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((current) => !current);
    if (this.sidebarCollapsed()) this.userMenuOpen.set(false);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (window.innerWidth >= 981) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const footer = this.footerRef()?.nativeElement;
    if (!footer) return;
    if (this.userMenuOpen() && !footer.contains(event.target as Node)) {
      this.userMenuOpen.set(false);
    }
  }
}

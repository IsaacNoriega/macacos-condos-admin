import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
	{
		path: 'login',
		loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
	},
	{
		path: '',
		canActivate: [authGuard],
		loadComponent: () => import('./features/layout/shell/shell.page').then((m) => m.ShellPage),
		children: [
			{
				path: 'dashboard',
				loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
			},
			{
				path: 'tenants',
				canActivate: [roleGuard],
				data: { roles: ['superadmin'] },
				loadComponent: () => import('./features/pages/tenants/tenants.page').then((m) => m.TenantsPage),
			},
			{
				path: 'users',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin'] },
				loadComponent: () => import('./features/pages/users/users.page').then((m) => m.UsersPage),
			},
			{
				path: 'units',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin', 'residente'] },
				loadComponent: () => import('./features/pages/units/units.page').then((m) => m.UnitsPage),
			},
			{
				path: 'residents',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin'] },
				loadComponent: () => import('./features/pages/residents/residents.page').then((m) => m.ResidentsPage),
			},
			{
				path: 'charges',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin'] },
				loadComponent: () => import('./features/pages/charges/charges.page').then((m) => m.ChargesPage),
			},
			{
				path: 'payments',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin', 'residente', 'familiar'] },
				loadComponent: () => import('./features/pages/payments/payments.page').then((m) => m.PaymentsPage),
			},
			{
				path: 'pagos/exito',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin', 'residente', 'familiar'] },
				loadComponent: () => import('./features/pages/payments/payments.page').then((m) => m.PaymentsPage),
			},
			{
				path: 'pagos/cancelado',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin', 'residente', 'familiar'] },
				loadComponent: () => import('./features/pages/payments/payments.page').then((m) => m.PaymentsPage),
			},
			{
				path: 'maintenance',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin', 'residente', 'familiar'] },
				loadComponent: () =>
					import('./features/pages/maintenance/maintenance.page').then((m) => m.MaintenancePage),
			},
			{
				path: 'amenities',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin'] },
				loadComponent: () =>
					import('./features/pages/amenities/amenities.page').then((m) => m.AmenitiesPage),
			},
			{
				path: 'reservations',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin', 'residente', 'familiar'] },
				loadComponent: () =>
					import('./features/pages/reservations/reservations.page').then((m) => m.ReservationsPage),
			},
			{
				path: 'notices',
				canActivate: [roleGuard],
				data: { roles: ['superadmin', 'admin', 'residente', 'familiar'] },
				loadComponent: () => import('./features/pages/notices/notices.page').then((m) => m.NoticesPage),
			},
			{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
		],
	},
	{ path: '**', redirectTo: '' },
];

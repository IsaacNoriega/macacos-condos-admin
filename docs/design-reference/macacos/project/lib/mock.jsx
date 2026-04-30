/* global React */
// Shared mock data for all pages

const MOCK = {
  tenant: { id: 't-macacos', name: 'Residencial Villa Encino', code: 'RVE' },
  user: {
    Admin: { name: 'Lucía Medrano', email: 'lucia.m@villaencino.mx', role: 'Administradora', avatarColor: 'navy' },
    SuperAdmin: { name: 'Rafael Cantú', email: 'rafa@macacos.app', role: 'Super admin', avatarColor: 'amber' },
    Residente: { name: 'Daniela Ríos', email: 'dani.rios@mail.com', role: 'Residente · D-204', avatarColor: 'info' },
  },
  kpis: [
    { id: 'collected', label: 'Cobrado este mes', value: 248620, delta: 12.4, trend: 'up', currency: true, sub: '96 pagos confirmados' },
    { id: 'pending', label: 'Pendiente de cobro', value: 41800, delta: -6.2, trend: 'down', currency: true, sub: '14 cargos abiertos' },
    { id: 'occupancy', label: 'Ocupación', value: 92, delta: 2.1, trend: 'up', suffix: '%', sub: '46 de 50 unidades' },
    { id: 'tickets', label: 'Reportes abiertos', value: 7, delta: 3, trend: 'up', sub: '2 de prioridad alta' },
  ],
  trend6m: [
    { m: 'Nov', ingresos: 198, gastos: 112 },
    { m: 'Dic', ingresos: 221, gastos: 128 },
    { m: 'Ene', ingresos: 204, gastos: 119 },
    { m: 'Feb', ingresos: 236, gastos: 134 },
    { m: 'Mar', ingresos: 242, gastos: 141 },
    { m: 'Abr', ingresos: 248, gastos: 127 },
  ],
  categoryBars: [
    { cat: 'Mantenimiento', value: 84, color: 'var(--primary)' },
    { cat: 'Cuotas', value: 156, color: 'var(--accent)' },
    { cat: 'Multas', value: 22, color: 'var(--warn-500)' },
    { cat: 'Servicios', value: 48, color: 'var(--info-500)' },
    { cat: 'Otros', value: 18, color: 'var(--ok-500)' },
  ],
  donut: [
    { k: 'Pagado', v: 62, color: 'var(--ok-500)' },
    { k: 'Pendiente', v: 23, color: 'var(--warn-500)' },
    { k: 'Vencido', v: 15, color: 'var(--bad-500)' },
  ],

  residents: [
    { id: 1, name: 'Daniela Ríos', unit: 'D-204', role: 'Titular', phone: '+52 55 2341 0098', since: 'Mar 2023', active: true, fam: 2 },
    { id: 2, name: 'Héctor Valdés', unit: 'A-102', role: 'Titular', phone: '+52 81 4412 8833', since: 'Ene 2022', active: true, fam: 4 },
    { id: 3, name: 'Marina Céspedes', unit: 'B-305', role: 'Familiar', phone: '+52 33 6611 4421', since: 'Oct 2024', active: true, fam: 0 },
    { id: 4, name: 'Joaquín Peralta', unit: 'C-112', role: 'Titular', phone: '+52 55 9900 1223', since: 'Jun 2021', active: false, fam: 1 },
    { id: 5, name: 'Sofía Arellano', unit: 'D-208', role: 'Titular', phone: '+52 55 7733 4455', since: 'Feb 2025', active: true, fam: 3 },
    { id: 6, name: 'Tomás Ibarra', unit: 'A-107', role: 'Familiar', phone: '+52 55 3321 9988', since: 'Ago 2024', active: true, fam: 0 },
    { id: 7, name: 'Valeria Núñez', unit: 'E-401', role: 'Titular', phone: '+52 55 1188 6622', since: 'Dic 2022', active: true, fam: 2 },
    { id: 8, name: 'Benjamín Ruíz', unit: 'B-301', role: 'Titular', phone: '+52 55 2277 4433', since: 'May 2023', active: true, fam: 1 },
  ],

  units: [
    { id: 1, code: 'A-102', type: 'Departamento', desc: 'Torre A · 2 recámaras', occ: 4, max: 5, lockup: false },
    { id: 2, code: 'A-107', type: 'Departamento', desc: 'Torre A · 1 recámara', occ: 2, max: 3, lockup: false },
    { id: 3, code: 'B-301', type: 'Departamento', desc: 'Torre B · 3 recámaras', occ: 5, max: 5, lockup: false },
    { id: 4, code: 'B-305', type: 'Departamento', desc: 'Torre B · 2 recámaras', occ: 1, max: 4, lockup: false },
    { id: 5, code: 'C-112', type: 'Casa', desc: 'Casa unifamiliar · 3 niveles', occ: 0, max: 6, lockup: true },
    { id: 6, code: 'D-204', type: 'Casa', desc: 'Casa con jardín', occ: 3, max: 5, lockup: false },
    { id: 7, code: 'D-208', type: 'Casa', desc: 'Casa con estudio', occ: 4, max: 5, lockup: false },
    { id: 8, code: 'LC-01', type: 'Local', desc: 'Local planta baja · 45 m²', occ: 2, max: 3, lockup: false },
    { id: 9, code: 'LC-02', type: 'Local', desc: 'Local planta baja · 32 m²', occ: 0, max: 2, lockup: true },
  ],

  charges: [
    { id: 'C-0231', unit: 'D-204', resident: 'Daniela Ríos', desc: 'Cuota mantenimiento · abril', amount: 2450, dueDate: '2026-04-28', status: 'pendiente', daysLeft: 5, lateFee: 30 },
    { id: 'C-0232', unit: 'A-102', resident: 'Héctor Valdés', desc: 'Cuota mantenimiento · abril', amount: 2450, dueDate: '2026-04-28', status: 'pagado', daysLeft: 5, lateFee: 30 },
    { id: 'C-0219', unit: 'B-305', resident: 'Marina Céspedes', desc: 'Multa · uso indebido área común', amount: 800, dueDate: '2026-04-10', status: 'vencido', daysLeft: -13, lateFee: 25 },
    { id: 'C-0222', unit: 'C-112', resident: 'Joaquín Peralta', desc: 'Cuota extraordinaria · fachada', amount: 1800, dueDate: '2026-05-15', status: 'pendiente', daysLeft: 22, lateFee: 50 },
    { id: 'C-0205', unit: 'E-401', resident: 'Valeria Núñez', desc: 'Cuota mantenimiento · marzo', amount: 2450, dueDate: '2026-03-28', status: 'vencido', daysLeft: -26, lateFee: 30 },
    { id: 'C-0235', unit: 'D-208', resident: 'Sofía Arellano', desc: 'Cuota mantenimiento · abril', amount: 2450, dueDate: '2026-04-28', status: 'pagado', daysLeft: 5, lateFee: 30 },
    { id: 'C-0236', unit: 'B-301', resident: 'Benjamín Ruíz', desc: 'Cuota extraordinaria · fachada', amount: 1800, dueDate: '2026-05-15', status: 'pendiente', daysLeft: 22, lateFee: 50 },
  ],

  payments: [
    { id: 'P-1022', charge: 'C-0232', resident: 'Héctor Valdés', amount: 2450, currency: 'MXN', method: 'Stripe', status: 'aprobado', when: 'Hace 2 h', receipt: true },
    { id: 'P-1021', charge: 'C-0235', resident: 'Sofía Arellano', amount: 2450, currency: 'MXN', method: 'Transferencia', status: 'revisión', when: 'Hace 4 h', receipt: true },
    { id: 'P-1020', charge: 'C-0205', resident: 'Valeria Núñez', amount: 2450, currency: 'MXN', method: 'Transferencia', status: 'rechazado', when: 'Ayer · 18:20', receipt: true },
    { id: 'P-1019', charge: 'C-0231-p1', resident: 'Daniela Ríos', amount: 1200, currency: 'MXN', method: 'Transferencia', status: 'aprobado', when: 'Ayer · 11:04', receipt: true },
    { id: 'P-1018', charge: 'C-0218', resident: 'Marina Céspedes', amount: 700, currency: 'MXN', method: 'Stripe', status: 'aprobado', when: '2 días', receipt: false },
  ],

  tickets: [
    { id: 'T-048', title: 'Fuga en llave de jardín', unit: 'D-204', priority: 'alta', status: 'abierto', opened: 'Hoy · 09:12', assignee: 'Jardín', updates: 1 },
    { id: 'T-047', title: 'Luz del pasillo piso 3 fundida', unit: 'B-301', priority: 'media', status: 'progreso', opened: 'Ayer', assignee: 'Electricidad', updates: 3 },
    { id: 'T-046', title: 'Portón principal no cierra bien', unit: 'Común', priority: 'alta', status: 'progreso', opened: 'Ayer', assignee: 'Seguridad', updates: 5 },
    { id: 'T-045', title: 'Interfono sin audio', unit: 'A-107', priority: 'baja', status: 'abierto', opened: 'Hace 3 días', assignee: 'Sin asignar', updates: 0 },
    { id: 'T-044', title: 'Filtración en azotea', unit: 'E-401', priority: 'alta', status: 'resuelto', opened: 'Hace 5 días', assignee: 'Impermeabilizado', updates: 6 },
    { id: 'T-043', title: 'Poda árbol entrada', unit: 'Común', priority: 'baja', status: 'resuelto', opened: 'Hace 1 semana', assignee: 'Jardín', updates: 3 },
  ],

  reservations: [
    { id: 'R-201', amenity: 'Salón de eventos', date: '2026-04-26', from: '17:00', to: '22:00', user: 'Daniela Ríos', unit: 'D-204', status: 'confirmada' },
    { id: 'R-202', amenity: 'Terraza rooftop', date: '2026-04-25', from: '19:00', to: '23:00', user: 'Valeria Núñez', unit: 'E-401', status: 'confirmada' },
    { id: 'R-203', amenity: 'Cancha de pádel', date: '2026-04-24', from: '08:00', to: '09:30', user: 'Héctor Valdés', unit: 'A-102', status: 'confirmada' },
    { id: 'R-204', amenity: 'Asadores', date: '2026-04-28', from: '13:00', to: '17:00', user: 'Sofía Arellano', unit: 'D-208', status: 'pendiente' },
    { id: 'R-205', amenity: 'Salón de eventos', date: '2026-05-02', from: '14:00', to: '20:00', user: 'Benjamín Ruíz', unit: 'B-301', status: 'pendiente' },
    { id: 'R-206', amenity: 'Cancha de pádel', date: '2026-04-22', from: '18:00', to: '19:30', user: 'Tomás Ibarra', unit: 'A-107', status: 'cancelada' },
  ],

  tenants: [
    { id: 1, name: 'Residencial Villa Encino', code: 'RVE', units: 50, residents: 142, active: true, payMonth: 248620, tickets: 7 },
    { id: 2, name: 'Torres del Parque', code: 'TDP', units: 88, residents: 236, active: true, payMonth: 412400, tickets: 12 },
    { id: 3, name: 'Condominio Las Lomas', code: 'CLL', units: 32, residents: 84, active: true, payMonth: 158900, tickets: 3 },
    { id: 4, name: 'Vista Real Norte', code: 'VRN', units: 24, residents: 58, active: false, payMonth: 0, tickets: 0 },
    { id: 5, name: 'Jardines del Sol', code: 'JDS', units: 64, residents: 172, active: true, payMonth: 301200, tickets: 9 },
  ],

  usersAll: [
    { id: 1, name: 'Lucía Medrano', email: 'lucia.m@villaencino.mx', role: 'Admin', created: '2023-03-14', lastSeen: 'Hoy · 08:40', active: true, avatar: 'navy' },
    { id: 2, name: 'Rafael Cantú', email: 'rafa@macacos.app', role: 'SuperAdmin', created: '2022-11-01', lastSeen: 'Hace 3 min', active: true, avatar: 'amber' },
    { id: 3, name: 'Daniela Ríos', email: 'dani.rios@mail.com', role: 'Residente', created: '2023-03-20', lastSeen: 'Ayer', active: true, avatar: 'info' },
    { id: 4, name: 'Héctor Valdés', email: 'hector.v@mail.com', role: 'Residente', created: '2022-01-09', lastSeen: 'Hace 2 días', active: true, avatar: 'info' },
    { id: 5, name: 'Marina Céspedes', email: 'marina.c@mail.com', role: 'Familiar', created: '2024-10-11', lastSeen: 'Hoy · 07:12', active: true, avatar: 'ok' },
    { id: 6, name: 'Joaquín Peralta', email: 'j.peralta@mail.com', role: 'Residente', created: '2021-06-02', lastSeen: 'Hace 2 semanas', active: false, avatar: 'info' },
    { id: 7, name: 'Sofía Arellano', email: 'sofia.a@mail.com', role: 'Residente', created: '2025-02-17', lastSeen: 'Hace 1 h', active: true, avatar: 'info' },
  ],

  amenities: ['Salón de eventos', 'Terraza rooftop', 'Cancha de pádel', 'Asadores', 'Alberca'],
};

window.MOCK = MOCK;

// Helpers
window.fmtMoney = (n, currency = 'MXN') => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
};
window.fmtDate = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

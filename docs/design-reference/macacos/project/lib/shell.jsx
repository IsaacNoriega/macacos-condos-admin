/* global React, I */
const { useState, useEffect, useRef } = React;

// -------------------- Sidebar --------------------
const NAV = [
  {
    group: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'Dashboard' },
      { id: 'residents', label: 'Residentes', icon: 'Users' },
      { id: 'units', label: 'Unidades', icon: 'Building' },
    ],
  },
  {
    group: 'Finanzas',
    items: [
      { id: 'charges', label: 'Cargos', icon: 'Receipt', badge: 14 },
      { id: 'payments', label: 'Pagos', icon: 'Card', badge: 3 },
    ],
  },
  {
    group: 'Operación',
    items: [
      { id: 'maintenance', label: 'Mantenimiento', icon: 'Wrench', badge: 7 },
      { id: 'reservations', label: 'Reservaciones', icon: 'Calendar' },
    ],
  },
  {
    group: 'Administración',
    role: ['SuperAdmin'],
    items: [
      { id: 'tenants', label: 'Condominios', icon: 'Shield' },
    ],
  },
  {
    group: 'Sistema',
    role: ['SuperAdmin', 'Admin'],
    items: [
      { id: 'users', label: 'Usuarios', icon: 'User' },
    ],
  },
];

function Sidebar({ active, onNav, collapsed, onToggle, role, onRoleChange, onLogout }) {
  const u = MOCK.user[role];
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const groups = NAV.filter(g => !g.role || g.role.includes(role));

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="logo-mark">M</div>
        <div className="wordmark-wrap">
          <div className="wordmark">Macacos</div>
          <span className="wordmark-sub">{MOCK.tenant.code} · Admin</span>
        </div>
      </div>

      <div className="sidebar-nav scroll-soft">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="nav-group-label">{g.group}</div>
            {g.items.map((it) => {
              const IconC = I[it.icon];
              return (
                <button
                  key={it.id}
                  className={`nav-item ${active === it.id ? 'active' : ''}`}
                  onClick={() => onNav(it.id)}
                  title={collapsed ? it.label : undefined}
                >
                  <span className="ni-icon"><IconC size={18} /></span>
                  <span className="ni-label">{it.label}</span>
                  {it.badge ? <span className="ni-badge">{it.badge}</span> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="sidebar-footer" ref={ref}>
        <button className="user-chip" onClick={() => setMenu((m) => !m)}>
          <div className={`avatar ${u.avatarColor}`}>{u.name.split(' ').map(s => s[0]).slice(0,2).join('')}</div>
          <div className="uc-info">
            <div className="uc-name">{u.name}</div>
            <div className="uc-role">{u.role}</div>
          </div>
          <span className="uc-caret"><I.ChevronUp size={14}/></span>
        </button>
        {menu && (
          <div className="dropdown" style={{ bottom: 66, left: 10, right: 10 }}>
            <button className="dd-item"><I.User size={15}/> Mi perfil</button>
            <button className="dd-item"><I.Settings size={15}/> Preferencias</button>
            <div className="dd-divider"/>
            <div style={{ padding: '6px 10px 4px', fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Rol (demo)</div>
            {['SuperAdmin','Admin','Residente'].map(r => (
              <button key={r} className="dd-item" onClick={() => { onRoleChange(r); setMenu(false); }}>
                <span style={{ width: 14, display:'inline-flex' }}>{role === r ? <I.Check size={14}/> : null}</span>
                {r}
              </button>
            ))}
            <div className="dd-divider"/>
            <button className="dd-item danger" onClick={onLogout}><I.LogOut size={15}/> Cerrar sesión</button>
          </div>
        )}
      </div>
    </aside>
  );
}

// -------------------- Topbar --------------------
function Topbar({ pageTitle, crumbs, onToggleSidebar, role, onRoleChange, theme, onToggleTheme, pushToast }) {
  return (
    <header className="topbar">
      <button className="btn icon-only ghost sm" onClick={onToggleSidebar} title="Colapsar sidebar">
        <I.PanelLeft size={16}/>
      </button>
      <div className="tb-crumbs">
        <I.Home2 size={14}/>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <I.ChevronRight size={12}/>
            <span className={i === crumbs.length-1 ? 'tb-current' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>

      <div className="tb-search">
        <I.Search size={14}/>
        <input placeholder="Buscar unidades, residentes, cargos..." />
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
          <span className="kbd">⌘</span><span className="kbd">K</span>
        </span>
      </div>

      <div className="role-switcher" title="Rol (demo)">
        {['SuperAdmin','Admin','Residente'].map(r => (
          <button key={r} className={role === r ? 'on' : ''} onClick={() => onRoleChange(r)}>{r}</button>
        ))}
      </div>

      <button className="btn icon-only ghost" title="Notificaciones" onClick={() => pushToast({ kind: 'info', title: '3 notificaciones nuevas', msg: 'Tiene pagos pendientes de aprobar.' })}>
        <span style={{ position: 'relative' }}>
          <I.Bell size={17}/>
          <span style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: 999, background: 'var(--accent)', border: '2px solid var(--bg-elev)' }}/>
        </span>
      </button>

      <button className="btn icon-only ghost" onClick={onToggleTheme} title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}>
        {theme === 'dark' ? <I.Sun size={17}/> : <I.Moon size={17}/>}
      </button>
    </header>
  );
}

// -------------------- Badges / Status pills --------------------
function StatusBadge({ status }) {
  const map = {
    pagado: { cls: 'ok', label: 'Pagado' },
    pendiente: { cls: 'warn', label: 'Pendiente' },
    vencido: { cls: 'bad', label: 'Vencido' },
    activo: { cls: 'ok', label: 'Activo' },
    inactivo: { cls: '', label: 'Inactivo' },
    aprobado: { cls: 'ok', label: 'Aprobado' },
    'revisión': { cls: 'warn', label: 'En revisión' },
    rechazado: { cls: 'bad', label: 'Rechazado' },
    abierto: { cls: 'bad', label: 'Abierto' },
    progreso: { cls: 'warn', label: 'En progreso' },
    resuelto: { cls: 'ok', label: 'Resuelto' },
    confirmada: { cls: 'ok', label: 'Confirmada' },
    cancelada: { cls: '', label: 'Cancelada' },
  };
  const it = map[status] || { cls: '', label: status };
  return <span className={`badge ${it.cls}`}><span className="badge-dot"/>{it.label}</span>;
}

// -------------------- Toast system --------------------
function Toasts({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.kind}`}>
          <span className="toast-icon">
            {t.kind === 'ok' && <I.CheckCircle size={18}/>}
            {t.kind === 'bad' && <I.XCircle size={18}/>}
            {t.kind === 'info' && <I.Info size={18}/>}
          </span>
          <div style={{ flex: 1 }}>
            <div className="toast-title">{t.title}</div>
            {t.msg && <div className="toast-msg">{t.msg}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// -------------------- Confirm Modal --------------------
function ConfirmModal({ open, title, message, confirmLabel = 'Eliminar', danger = true, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-icon"><I.AlertTri size={20}/></div>
          <div style={{ flex: 1 }}>
            <div className="modal-body" style={{ padding: 0 }}>
              <h3>{title}</h3>
              <p>{message}</p>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onCancel}>Cancelar</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// -------------------- Empty state --------------------
function Empty({ title, message, cta, onCta }) {
  return (
    <div className="empty">
      <svg width="120" height="86" viewBox="0 0 120 86" fill="none" aria-hidden="true">
        <rect x="8" y="22" width="104" height="56" rx="8" fill="var(--surface-muted)" stroke="var(--border)"/>
        <rect x="20" y="34" width="44" height="6" rx="3" fill="var(--border-strong)"/>
        <rect x="20" y="46" width="70" height="4" rx="2" fill="var(--border)"/>
        <rect x="20" y="56" width="56" height="4" rx="2" fill="var(--border)"/>
        <circle cx="96" cy="22" r="14" fill="var(--accent-soft)" stroke="var(--accent)"/>
        <path d="M90 22h12M96 16v12" stroke="var(--accent-strong)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <h3>{title}</h3>
      <p>{message}</p>
      {cta && <button className="btn primary" onClick={onCta}><I.Plus size={15}/>{cta}</button>}
    </div>
  );
}

// -------------------- Skeleton row --------------------
function SkelRow({ h = 12, w = '100%' }) { return <div className="skel" style={{ height: h, width: w }}/>; }

Object.assign(window, { Sidebar, Topbar, StatusBadge, Toasts, ConfirmModal, Empty, SkelRow });

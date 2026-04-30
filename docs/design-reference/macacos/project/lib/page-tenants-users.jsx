/* global React, I, MOCK, fmtMoney, StatusBadge */
const { useState: useS7 } = React;

// ============ TENANTS (SuperAdmin) ============
function TenantsPage({ pushToast }) {
  const [tenants, setTenants] = useS7(MOCK.tenants);
  const [newOpen, setNewOpen] = useS7(false);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Condominios</h1>
          <p className="page-sub">{tenants.length} condominios · {tenants.filter(t=>t.active).length} activos · {tenants.reduce((s,t)=>s+t.units,0)} unidades totales</p>
        </div>
        <button className="btn primary" onClick={()=>setNewOpen(true)}><I.Plus size={15}/>Añadir condominio</button>
      </div>

      <div className="grid cols-3">
        {tenants.map(t => (
          <div key={t.id} className="card hoverable" style={{ overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: 80, background: t.active ? 'linear-gradient(135deg, var(--brand-navy-700), var(--brand-navy-500))' : 'linear-gradient(135deg, var(--warm-700), var(--warm-500))' }}>
              <div style={{ position: 'absolute', right: 12, top: 12 }}>
                <span className={`badge ${t.active?'ok':''}`} style={{ background: t.active?'oklch(0.96 0.04 155 / 0.9)':'var(--surface)' }}>
                  <span className="badge-dot"/>{t.active?'Activo':'Inactivo'}
                </span>
              </div>
              <div style={{ position: 'absolute', left: 14, bottom: -20, width: 48, height: 48, borderRadius: 12, background: 'var(--bg-elev)', border: '3px solid var(--bg-elev)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 500, color: 'var(--brand-navy-800)', boxShadow: 'var(--shadow-sm)' }}>
                {t.code[0]}
              </div>
            </div>
            <div style={{ padding: '28px 18px 18px' }}>
              <div style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 2 }}>{t.name}</div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 14 }}>{t.code}</div>

              <div className="grid cols-2" style={{ gap: 10, marginBottom: 14 }}>
                <div style={{ padding: 10, background: 'var(--surface-muted)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Unidades</div>
                  <div className="mono tabular" style={{ fontSize: 18, fontWeight: 600 }}>{t.units}</div>
                </div>
                <div style={{ padding: 10, background: 'var(--surface-muted)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Residentes</div>
                  <div className="mono tabular" style={{ fontSize: 18, fontWeight: 600 }}>{t.residents}</div>
                </div>
              </div>

              <div className="row between" style={{ fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Pagos del mes</span>
                <span className="mono tabular" style={{ fontWeight: 600 }}>{fmtMoney(t.payMonth)}</span>
              </div>
              <div className="row between" style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Reportes abiertos</span>
                <span className={`badge ${t.tickets>8?'bad':t.tickets>3?'warn':'ok'}`} style={{ height: 20 }}>{t.tickets}</span>
              </div>

              <div className="row gap-sm" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--border-subtle)' }}>
                <button className={`switch ${t.active?'on':''}`}
                  onClick={() => { setTenants(ts => ts.map(x => x.id===t.id ? {...x, active: !x.active} : x)); pushToast({kind:'ok', title: t.active ? 'Condominio desactivado':'Condominio activado'}); }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.active?'Habilitado':'Deshabilitado'}</span>
                <button className="btn sm" style={{ marginLeft: 'auto' }}><I.ArrowRight size={13}/>Entrar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <NewTenantDrawer open={newOpen} onClose={()=>setNewOpen(false)} pushToast={pushToast}/>
    </div>
  );
}

// ============ USERS ============
function UsersPage({ pushToast }) {
  const [filter, setFilter] = useS7('todos');
  const [editing, setEditing] = useS7(null);
  const users = MOCK.usersAll.filter(u => filter==='todos' || u.role.toLowerCase()===filter);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-sub">{MOCK.usersAll.length} usuarios · {MOCK.usersAll.filter(u=>u.active).length} activos</p>
        </div>
        <button className="btn primary" onClick={()=>setEditing({})}><I.Plus size={15}/>Invitar usuario</button>
      </div>

      <div className="row gap-sm" style={{ marginBottom: 14 }}>
        {[['todos','Todos'],['superadmin','SuperAdmin'],['admin','Admin'],['residente','Residente'],['familiar','Familiar']].map(([k,v]) => (
          <button key={k} className={`chip ${filter===k?'on':''}`} onClick={()=>setFilter(k)}>{v}</button>
        ))}
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="row" style={{ padding: '12px 18px', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ flex: 2, minWidth: 0 }}>Usuario</div>
          <div style={{ width: 130 }}>Rol</div>
          <div style={{ width: 140 }}>Creado</div>
          <div style={{ width: 150 }}>Último acceso</div>
          <div style={{ width: 100 }}>Estado</div>
          <div style={{ width: 40 }}></div>
        </div>
        {users.map((u, i) => (
          <div key={u.id} className="row" style={{ padding: '12px 18px', borderTop: i?'1px solid var(--border-subtle)':'none', background: i%2?'transparent':'transparent' }}>
            <div className="row gap" style={{ flex: 2, minWidth: 0 }}>
              <div className={`avatar ${u.avatar}`}>{u.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
              </div>
            </div>
            <div style={{ width: 130 }}>
              <span className={`badge ${u.role==='SuperAdmin'?'amber':u.role==='Admin'?'navy':u.role==='Familiar'?'ok':'info'}`}>{u.role}</span>
            </div>
            <div style={{ width: 140, fontSize: 12.5, color: 'var(--text-muted)' }}>{new Date(u.created).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}</div>
            <div style={{ width: 150, fontSize: 12.5, color: 'var(--text-soft)' }}>
              <span className="row gap-sm"><span style={{ width: 6, height: 6, borderRadius: 999, background: u.lastSeen.includes('min')||u.lastSeen.includes('Hoy')?'var(--ok-500)':'var(--text-faint)' }}/>{u.lastSeen}</span>
            </div>
            <div style={{ width: 100 }}><span className={`badge ${u.active?'ok':''}`}><span className="badge-dot"/>{u.active?'Activo':'Inactivo'}</span></div>
            <button className="btn sm icon-only ghost" style={{ width: 40 }} onClick={()=>setEditing(u)}><I.Edit size={13}/></button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={()=>setEditing(null)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="card-head between" style={{ padding: '18px 20px' }}>
              <div>
                <div className="card-title">{editing.id?'Editar usuario':'Invitar usuario'}</div>
                <div className="card-sub">Cambie rol, email o acceso</div>
              </div>
              <button className="btn ghost sm icon-only" onClick={()=>setEditing(null)}><I.X size={14}/></button>
            </div>
            <div style={{ padding: 20 }} className="stack">
              <div className="field"><label className="field-label">Nombre</label><input className="input" defaultValue={editing.name||''}/></div>
              <div className="field"><label className="field-label">Email</label><input className="input" defaultValue={editing.email||''}/></div>
              <div className="field"><label className="field-label">Rol</label>
                <select className="select" defaultValue={editing.role||'Residente'}>
                  <option>SuperAdmin</option><option>Admin</option><option>Residente</option><option>Familiar</option>
                </select>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={()=>setEditing(null)}>Cancelar</button>
              <button className="btn primary" onClick={()=>{ pushToast({kind:'ok', title:'Usuario guardado'}); setEditing(null); }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.TenantsPage = TenantsPage;
window.UsersPage = UsersPage;

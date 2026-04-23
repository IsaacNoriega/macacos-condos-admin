/* global React, I, MOCK, StatusBadge, Empty, ConfirmModal */
const { useState: useS3, useMemo: useM3 } = React;

// ============ RESIDENTS ============
function ResidentsPage({ pushToast }) {
  const [q, setQ] = useS3('');
  const [filter, setFilter] = useS3('todos');
  const [confirm, setConfirm] = useS3(null);
  const [residents, setResidents] = useS3(MOCK.residents);
  const [editing, setEditing] = useS3(null);
  const [newOpen, setNewOpen] = useS3(false);
  const [detailRes, setDetailRes] = useS3(null);

  const filtered = useM3(() => {
    return residents.filter(r => {
      if (filter === 'activos' && !r.active) return false;
      if (filter === 'inactivos' && r.active) return false;
      if (filter === 'titular' && r.role !== 'Titular') return false;
      if (filter === 'familiar' && r.role !== 'Familiar') return false;
      if (q && !`${r.name} ${r.unit}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, filter, residents]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Residentes</h1>
          <p className="page-sub">{filtered.length} de {residents.length} · {residents.filter(r=>r.active).length} activos</p>
        </div>
        <button className="btn primary" onClick={()=>setNewOpen(true)}><I.Plus size={15}/>Añadir residente</button>
      </div>

      <div className="row gap between" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="input-wrap" style={{ maxWidth: 360, flex: 1 }}>
          <span className="input-icon"><I.Search size={14}/></span>
          <input className="input with-icon" placeholder="Buscar por nombre o unidad..." value={q} onChange={(e)=>setQ(e.target.value)}/>
        </div>
        <div className="row gap-sm" style={{ flexWrap:'wrap' }}>
          {[['todos','Todos'],['activos','Activos'],['inactivos','Inactivos'],['titular','Titulares'],['familiar','Familiares']].map(([k,v]) => (
            <button key={k} className={`chip ${filter===k?'on':''}`} onClick={()=>setFilter(k)}>{v}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty title="Sin resultados" message="Pruebe ajustar los filtros o la búsqueda." />
      ) : (
        <div className="grid cols-3">
          {filtered.map(r => (
            <ResidentCard key={r.id} r={r}
              onOpen={() => setDetailRes(r)}
              onToggle={() => {
                setResidents(rs => rs.map(x => x.id===r.id ? { ...x, active: !x.active } : x));
                pushToast({ kind:'ok', title: r.active ? 'Residente desactivado':'Residente activado' });
              }}
              onEdit={()=>setDetailRes(r)}
              onDelete={() => setConfirm(r)}
            />
          ))}
        </div>
      )}

      <NewResidentDrawer open={newOpen} onClose={()=>setNewOpen(false)} pushToast={pushToast}/>
      <ResidentDrawer resident={detailRes} onClose={()=>setDetailRes(null)} pushToast={pushToast}/>

      <ConfirmModal
        open={!!confirm}
        title="¿Eliminar residente?"
        message={confirm ? `Se eliminará a ${confirm.name} (${confirm.unit}). Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        onCancel={()=>setConfirm(null)}
        onConfirm={()=>{
          setResidents(rs => rs.filter(x => x.id !== confirm.id));
          pushToast({ kind:'ok', title: 'Residente eliminado', msg: `${confirm.name} fue removido.` });
          setConfirm(null);
        }}
      />
    </div>
  );
}

function ResidentCard({ r, onToggle, onEdit, onDelete, onOpen }) {
  const initials = r.name.split(' ').map(s=>s[0]).slice(0,2).join('');
  return (
    <div className="card hoverable" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }} onClick={onOpen}>
      <div className="row gap">
        <div className="avatar lg">{initials}</div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{r.name}</div>
          <div className="row gap-sm" style={{ marginTop: 3 }}>
            <span className="badge navy">{r.role}</span>
            {r.fam > 0 && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.fam} familiar{r.fam>1?'es':''}</span>}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          title={r.active?'Desactivar':'Activar'}
          className={`switch ${r.active?'on':''}`}
        />
      </div>
      <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: 10, display: 'grid', gap: 6, fontSize: 12.5, color: 'var(--text-soft)' }}>
        <div className="row gap-sm"><I.Building size={13}/> Unidad <strong className="mono" style={{ marginLeft: 'auto' }}>{r.unit}</strong></div>
        <div className="row gap-sm"><I.Phone size={13}/> {r.phone}</div>
        <div className="row gap-sm"><I.Clock size={13}/> Desde {r.since}</div>
      </div>
      <div className="row gap-sm" style={{ marginTop: 2 }}>
        <button className="btn sm grow" onClick={(e)=>{e.stopPropagation();onEdit();}}><I.Edit size={13}/>Editar</button>
        <button className="btn sm danger-soft" onClick={(e)=>{e.stopPropagation();onDelete();}}><I.Trash size={13}/></button>
      </div>
    </div>
  );
}

// ============ UNITS ============
function UnitsPage({ pushToast }) {
  const [view, setView] = useS3('grid');
  const [filter, setFilter] = useS3('todos');
  const [detail, setDetail] = useS3(null);
  const [newOpen, setNewOpen] = useS3(false);
  const typeColor = { 'Departamento': 'var(--info-500)', 'Casa': 'var(--ok-500)', 'Local': 'var(--accent-strong)' };
  const typeIcon = { 'Departamento': 'Building', 'Casa': 'Cabin', 'Local': 'Store' };
  const units = MOCK.units.filter(u => filter==='todos' || u.type.toLowerCase()===filter);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Unidades</h1>
          <p className="page-sub">{MOCK.units.length} unidades · {MOCK.units.filter(u=>u.occ>0).length} ocupadas</p>
        </div>
        <div className="row gap-sm">
          <div className="seg">
            <button className={view==='grid'?'on':''} onClick={()=>setView('grid')}><I.Grid size={13}/>Grid</button>
            <button className={view==='list'?'on':''} onClick={()=>setView('list')}><I.List size={13}/>Lista</button>
          </div>
          <button className="btn primary" onClick={()=>setNewOpen(true)}><I.Plus size={15}/>Nueva unidad</button>
        </div>
      </div>

      <div className="row gap-sm" style={{ marginBottom: 16 }}>
        {[['todos','Todas'],['departamento','Departamentos'],['casa','Casas'],['local','Locales']].map(([k,v]) => (
          <button key={k} className={`chip ${filter===k?'on':''}`} onClick={()=>setFilter(k)}>{v}</button>
        ))}
      </div>

      {view === 'grid' ? (
        <div className="grid cols-3">
          {units.map(u => {
            const IC = I[typeIcon[u.type]];
            const pct = (u.occ/u.max)*100;
            return (
              <div key={u.id} className="card hoverable" style={{ overflow: 'hidden' }}>
                <div style={{ height: 6, background: typeColor[u.type] }}/>
                <div style={{ padding: 18 }}>
                  <div className="row between">
                    <div className="row gap-sm">
                      <div className="i-round" style={{ background: 'var(--surface-muted)', color: typeColor[u.type] }}><IC size={16}/></div>
                      <div>
                        <div className="mono" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' }}>{u.code}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{u.type}</div>
                      </div>
                    </div>
                    {u.lockup ? <span className="badge warn"><I.Lock size={11}/>No disponible</span> : <span className="badge ok"><I.Check size={11}/>Disponible</span>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-soft)', margin: '12px 0 14px' }}>{u.desc}</div>
                  <div className="row between" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                    <span>Ocupación</span>
                    <span className="mono tabular"><strong style={{ color: 'var(--text)' }}>{u.occ}</strong> / {u.max}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-muted)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct===100?'var(--warn-500)':typeColor[u.type], borderRadius: 999 }}/>
                  </div>
                  <div className="row gap-sm" style={{ marginTop: 14 }}>
                    <button className="btn sm grow" onClick={()=>setDetail(u)}><I.Eye size={13}/>Ver detalle</button>
                    <button className="btn sm icon-only"><I.Edit size={13}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          {units.map((u, i) => {
            const IC = I[typeIcon[u.type]];
            return (
              <div key={u.id} className="row gap" style={{ padding: '14px 18px', borderTop: i?'1px solid var(--border-subtle)':'none' }}>
                <div className="i-round" style={{ background: 'var(--surface-muted)', color: typeColor[u.type] }}><IC size={16}/></div>
                <div style={{ width: 80 }} className="mono">{u.code}</div>
                <div className="grow">{u.desc}</div>
                <span className="badge">{u.type}</span>
                <div className="mono tabular" style={{ width: 60, textAlign: 'right' }}>{u.occ}/{u.max}</div>
                {u.lockup ? <span className="badge warn">No disp.</span> : <span className="badge ok">Disponible</span>}
                <button className="btn sm" onClick={()=>setDetail(u)}><I.Eye size={13}/></button>
              </div>
            );
          })}
        </div>
      )}
      <UnitDrawer unit={detail} onClose={()=>setDetail(null)} pushToast={pushToast}/>
      <NewUnitDrawer open={newOpen} onClose={()=>setNewOpen(false)} pushToast={pushToast}/>
    </div>
  );
}

window.ResidentsPage = ResidentsPage;
window.UnitsPage = UnitsPage;

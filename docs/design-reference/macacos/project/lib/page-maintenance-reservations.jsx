/* global React, I, MOCK, StatusBadge */
const { useState: useS6 } = React;

// ============ MAINTENANCE ============
function MaintenancePage({ pushToast }) {
  const [view, setView] = useS6('list');
  const [prio, setPrio] = useS6('todas');
  const [detail, setDetail] = useS6(null);
  const [newOpen, setNewOpen] = useS6(false);
  const tickets = MOCK.tickets.filter(t => prio==='todas' || t.priority===prio);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Mantenimiento</h1>
          <p className="page-sub">{MOCK.tickets.filter(t=>t.status!=='resuelto').length} reportes abiertos · {MOCK.tickets.filter(t=>t.priority==='alta'&&t.status!=='resuelto').length} de alta prioridad</p>
        </div>
        <div className="row gap-sm">
          <div className="seg">
            <button className={view==='list'?'on':''} onClick={()=>setView('list')}><I.List size={13}/>Lista</button>
            <button className={view==='kanban'?'on':''} onClick={()=>setView('kanban')}><I.Kanban size={13}/>Kanban</button>
          </div>
          <button className="btn primary" onClick={()=>setNewOpen(true)}><I.Plus size={15}/>Nuevo reporte</button>
        </div>
      </div>

      <div className="row gap-sm" style={{ marginBottom: 16 }}>
        {[['todas','Todas'],['alta','Alta'],['media','Media'],['baja','Baja']].map(([k,v]) => (
          <button key={k} className={`chip ${prio===k?'on':''}`} onClick={()=>setPrio(k)}>{v} prioridad</button>
        ))}
      </div>

      {view === 'list' ? (
        <div className="stack-sm">{tickets.map(t => <TicketCard key={t.id} t={t} onOpen={()=>setDetail(t)}/>)}</div>
      ) : (
        <div className="grid cols-3">
          {[
            { k: 'abierto', title: 'Abierto', color: 'var(--bad-500)' },
            { k: 'progreso', title: 'En progreso', color: 'var(--warn-500)' },
            { k: 'resuelto', title: 'Resuelto', color: 'var(--ok-500)' },
          ].map(col => (
            <div key={col.k} className="card" style={{ background: 'var(--surface-muted)', borderStyle: 'dashed' }}>
              <div className="row between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="row gap-sm">
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: col.color }}/>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{col.title}</div>
                  <span className="badge">{MOCK.tickets.filter(t=>t.status===col.k).length}</span>
                </div>
                <button className="btn sm icon-only ghost"><I.Plus size={13}/></button>
              </div>
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 160 }}>
                {MOCK.tickets.filter(t=>t.status===col.k && (prio==='todas' || t.priority===prio)).map(t => (
                  <TicketMini key={t.id} t={t} onOpen={()=>setDetail(t)}/>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <TicketDrawer ticket={detail} onClose={()=>setDetail(null)} pushToast={pushToast}/>
      <NewTicketDrawer open={newOpen} onClose={()=>setNewOpen(false)} pushToast={pushToast}/>
    </div>
  );
}

function priorityMeta(p) {
  return p==='alta' ? { c: 'var(--bad-500)', lbl: 'Alta', bg: 'var(--bad-100)', tx: 'var(--bad-700)' }
    : p==='media' ? { c: 'var(--warn-500)', lbl: 'Media', bg: 'var(--warn-100)', tx: 'var(--warn-700)' }
    : { c: 'var(--info-500)', lbl: 'Baja', bg: 'var(--info-100)', tx: 'var(--info-700)' };
}

function TicketCard({ t, onOpen }) {
  const p = priorityMeta(t.priority);
  const steps = ['abierto','progreso','resuelto'];
  const idx = steps.indexOf(t.status);
  return (
    <div className="card hoverable" style={{ padding: 16, borderLeft: `3px solid ${p.c}`, display:'grid', gridTemplateColumns: '1fr 260px', gap: 20, cursor: 'pointer' }} onClick={onOpen}>
      <div>
        <div className="row gap-sm" style={{ marginBottom: 6 }}>
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t.id}</span>
          <span className="badge" style={{ background: p.bg, color: p.tx }}><span className="badge-dot"/>{p.lbl}</span>
          <StatusBadge status={t.status}/>
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{t.title}</div>
        <div className="row gap" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          <span className="row gap-sm"><I.MapPin size={13}/>{t.unit}</span>
          <span className="row gap-sm"><I.Clock size={13}/>{t.opened}</span>
          <span className="row gap-sm"><I.User size={13}/>{t.assignee}</span>
          {t.updates > 0 && <span className="row gap-sm"><I.Mail size={13}/>{t.updates} actualizaciones</span>}
        </div>
      </div>
      <div>
        <div className="row" style={{ gap: 4, marginBottom: 6 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= idx ? p.c : 'var(--border)' }}/>
          ))}
        </div>
        <div className="row between" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
          <span>Abierto</span><span>En progreso</span><span>Resuelto</span>
        </div>
        <div className="row gap-sm" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
          <button className="btn sm" onClick={(e)=>{e.stopPropagation();onOpen();}}><I.Eye size={13}/>Detalle</button>
          <button className="btn sm primary" onClick={(e)=>e.stopPropagation()}><I.ArrowRight size={13}/>Avanzar</button>
        </div>
      </div>
    </div>
  );
}

function TicketMini({ t, onOpen }) {
  const p = priorityMeta(t.priority);
  return (
    <div className="card" style={{ padding: 12, borderLeft: `3px solid ${p.c}`, cursor: 'pointer' }} onClick={onOpen}>
      <div className="row between" style={{ marginBottom: 4 }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>{t.id}</span>
        <span className="badge" style={{ background: p.bg, color: p.tx, height: 18 }}>{p.lbl}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t.title}</div>
      <div className="row between" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        <span>{t.unit}</span>
        <span>{t.opened}</span>
      </div>
    </div>
  );
}

// ============ RESERVATIONS ============
function ReservationsPage({ pushToast }) {
  const [view, setView] = useS6('calendar');
  const [newOpen, setNewOpen] = useS6(false);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Reservaciones</h1>
          <p className="page-sub">Abril 2026 · 6 reservas esta semana</p>
        </div>
        <div className="row gap-sm">
          <div className="seg">
            <button className={view==='calendar'?'on':''} onClick={()=>setView('calendar')}><I.Calendar size={13}/>Calendario</button>
            <button className={view==='list'?'on':''} onClick={()=>setView('list')}><I.List size={13}/>Lista</button>
          </div>
          <button className="btn primary" onClick={()=>setNewOpen(true)}><I.Plus size={15}/>Nueva reserva</button>
        </div>
      </div>

      {view === 'calendar' ? <CalendarView/> : <ReservationsList/>}
      <ReservationModal open={newOpen} onClose={()=>setNewOpen(false)} pushToast={pushToast}/>
    </div>
  );
}

function CalendarView() {
  // April 2026 starts on Wednesday
  const startDow = 3;
  const daysInMonth = 30;
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = {};
  MOCK.reservations.forEach(r => {
    const d = parseInt(r.date.split('-')[2]);
    (byDay[d] = byDay[d] || []).push(r);
  });

  const today = 23;
  const amenityColor = { 'Salón de eventos': 'var(--primary)', 'Terraza rooftop': 'var(--accent-strong)', 'Cancha de pádel': 'var(--info-500)', 'Asadores': 'var(--warn-500)' };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-head between">
        <div className="row gap-sm">
          <button className="btn sm icon-only"><I.ChevronLeft size={13}/></button>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '-0.01em' }}>Abril 2026</div>
          <button className="btn sm icon-only"><I.ChevronRight size={13}/></button>
          <button className="btn sm" style={{ marginLeft: 8 }}>Hoy</button>
        </div>
        <div className="row gap" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {Object.entries(amenityColor).map(([k,v]) => (
            <span key={k} className="row gap-sm"><span style={{ width: 8, height: 8, borderRadius: 2, background: v }}/>{k}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderTop: '1px solid var(--border-subtle)' }}>
        {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
          <div key={d} style={{ padding: '10px 12px', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid var(--border-subtle)' }}>{d}</div>
        ))}
        {cells.map((d, i) => (
          <div key={i} style={{ minHeight: 96, padding: 6, borderTop: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', background: d === today ? 'var(--primary-soft)' : 'transparent' }}>
            {d && (
              <>
                <div style={{ fontSize: 12, fontWeight: d===today?700:500, color: d===today?'var(--brand-navy-800)':'var(--text-soft)', marginBottom: 4 }}>
                  {d}
                </div>
                {(byDay[d] || []).slice(0,3).map(r => (
                  <div key={r.id} style={{
                    fontSize: 10.5, padding: '2px 6px', borderRadius: 4, marginBottom: 2,
                    background: r.status==='cancelada'?'var(--surface-muted)':`color-mix(in oklch, ${amenityColor[r.amenity] || 'var(--primary)'} 18%, var(--surface))`,
                    color: r.status==='cancelada'?'var(--text-muted)':amenityColor[r.amenity],
                    textDecoration: r.status==='cancelada'?'line-through':'none',
                    borderLeft: `2px solid ${amenityColor[r.amenity] || 'var(--primary)'}`,
                    fontWeight: 600,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{r.from} {r.amenity}</div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReservationsList() {
  return (
    <div className="stack-sm">
      {MOCK.reservations.map(r => (
        <div key={r.id} className="card hoverable" style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 56, textAlign: 'center', padding: '6px 0', background: 'var(--surface-muted)', borderRadius: 8 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{new Date(r.date+'T12:00:00').toLocaleDateString('es-MX',{month:'short'})}</div>
            <div className="mono" style={{ fontSize: 20, fontWeight: 600, lineHeight: 1 }}>{r.date.split('-')[2]}</div>
          </div>
          <div className="grow">
            <div style={{ fontSize: 14, fontWeight: 600 }}>{r.amenity}</div>
            <div className="row gap" style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
              <span className="row gap-sm"><I.Clock size={12}/>{r.from} – {r.to}</span>
              <span className="row gap-sm"><I.User size={12}/>{r.user}</span>
              <span className="mono">{r.unit}</span>
            </div>
          </div>
          <StatusBadge status={r.status}/>
          <button className="btn sm icon-only ghost"><I.MoreV size={14}/></button>
        </div>
      ))}
    </div>
  );
}

window.MaintenancePage = MaintenancePage;
window.ReservationsPage = ReservationsPage;

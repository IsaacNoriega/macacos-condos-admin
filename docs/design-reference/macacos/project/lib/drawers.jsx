/* global React, I, MOCK, fmtMoney, fmtDate, StatusBadge */
const { useEffect: useDrwE } = React;

// Generic side drawer
function Drawer({ open, onClose, title, subtitle, width = 480, children, footer }) {
  useDrwE(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'oklch(0.18 0.014 255 / 0.45)', backdropFilter: 'blur(3px)', animation: 'fadeIn 200ms ease' }}/>
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width, maxWidth: '94vw',
        background: 'var(--bg-elev)', borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInR 260ms var(--ease)',
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.15, letterSpacing: '-0.015em', color: 'var(--text)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button className="btn ghost sm icon-only" onClick={onClose}><I.X size={15}/></button>
        </div>
        <div className="scroll-soft" style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>{children}</div>
        {footer && <div style={{ padding: '14px 22px', background: 'var(--surface-muted)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } } @keyframes slideInR { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  );
}

// -------------------- Unit detail drawer --------------------
function UnitDrawer({ unit, onClose, pushToast }) {
  if (!unit) return null;
  const residents = MOCK.residents.filter(r => r.unit === unit.code);
  const charges = MOCK.charges.filter(c => c.unit === unit.code);
  return (
    <Drawer open={!!unit} onClose={onClose} title={unit.code}
      subtitle={`${unit.type} · ${unit.desc}`}
      footer={<>
        <button className="btn" onClick={onClose}>Cerrar</button>
        <button className="btn primary"><I.Edit size={13}/>Editar unidad</button>
      </>}>
      <div style={{ height: 110, borderRadius: 12, background: `linear-gradient(135deg, color-mix(in oklch, ${unit.type==='Departamento'?'var(--info-500)':unit.type==='Casa'?'var(--ok-500)':'var(--accent-strong)'} 85%, black), ${unit.type==='Departamento'?'var(--info-700)':unit.type==='Casa'?'var(--ok-700)':'var(--accent-strong)'})`, marginBottom: 18, display: 'grid', placeItems: 'center', color: 'white', fontFamily: 'var(--font-display)', fontSize: 40, letterSpacing: '-0.02em', position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position:'absolute', inset:0, opacity: 0.2 }} preserveAspectRatio="xMidYMid slice" viewBox="0 0 200 100">
          <defs><pattern id={`gu${unit.id}`} width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="white"/></pattern></defs>
          <rect width="100%" height="100%" fill={`url(#gu${unit.id})`}/>
        </svg>
        <span style={{ position:'relative' }}>{unit.code}</span>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div style={{ padding: 12, background:'var(--surface-muted)', borderRadius: 10 }}>
          <div style={{ fontSize: 10.5, color:'var(--text-muted)', textTransform:'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Residentes</div>
          <div className="mono tabular" style={{ fontSize: 22, fontWeight: 600 }}>{unit.occ}<span style={{ color:'var(--text-faint)', fontSize: 14 }}>/{unit.max}</span></div>
        </div>
        <div style={{ padding: 12, background:'var(--surface-muted)', borderRadius: 10 }}>
          <div style={{ fontSize: 10.5, color:'var(--text-muted)', textTransform:'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Al corriente</div>
          <div className="mono tabular" style={{ fontSize: 22, fontWeight: 600 }}>{charges.filter(c=>c.status==='pagado').length}</div>
        </div>
        <div style={{ padding: 12, background:'var(--surface-muted)', borderRadius: 10 }}>
          <div style={{ fontSize: 10.5, color:'var(--text-muted)', textTransform:'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>Pendientes</div>
          <div className="mono tabular" style={{ fontSize: 22, fontWeight: 600, color: charges.filter(c=>c.status!=='pagado').length>0?'var(--warn-700)':'inherit' }}>{charges.filter(c=>c.status!=='pagado').length}</div>
        </div>
      </div>

      <div className="section-title">Residentes</div>
      {residents.length === 0 ? (
        <div style={{ padding: 18, textAlign:'center', color:'var(--text-muted)', background:'var(--surface-muted)', borderRadius: 10, fontSize: 13 }}>Sin residentes asignados</div>
      ) : residents.map(r => (
        <div key={r.id} className="row gap" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="avatar">{r.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
          <div className="grow">
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.name}</div>
            <div style={{ fontSize: 12, color:'var(--text-muted)' }}>{r.role} · {r.phone}</div>
          </div>
          <span className={`badge ${r.active?'ok':''}`}><span className="badge-dot"/>{r.active?'Activo':'Inactivo'}</span>
        </div>
      ))}

      <div className="section-title" style={{ marginTop: 22 }}>Cargos recientes</div>
      {charges.length === 0 ? (
        <div style={{ padding: 18, textAlign:'center', color:'var(--text-muted)', background:'var(--surface-muted)', borderRadius: 10, fontSize: 13 }}>Sin cargos en esta unidad</div>
      ) : charges.map(c => (
        <div key={c.id} className="row gap" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="grow">
            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.desc}</div>
            <div style={{ fontSize: 11.5, color:'var(--text-muted)' }} className="mono">{c.id} · {fmtDate(c.dueDate)}</div>
          </div>
          <div className="mono tabular" style={{ fontSize: 14, fontWeight: 600 }}>{fmtMoney(c.amount)}</div>
          <StatusBadge status={c.status}/>
        </div>
      ))}
    </Drawer>
  );
}

// -------------------- Ticket drawer (maintenance) --------------------
function TicketDrawer({ ticket, onClose, pushToast }) {
  if (!ticket) return null;
  const timeline = [
    { t: 'Reporte creado', when: ticket.opened, icon: 'Plus', color: 'info' },
    ...(ticket.status!=='abierto' ? [{ t: 'Asignado a ' + ticket.assignee, when: 'Hace 1 día', icon: 'User', color: 'info' }] : []),
    ...(ticket.status==='progreso' || ticket.status==='resuelto' ? [{ t: 'Trabajo iniciado', when: 'Hace 20 h', icon: 'Wrench', color: 'warn' }] : []),
    ...(ticket.status==='resuelto' ? [{ t: 'Reporte resuelto', when: 'Hace 5 h', icon: 'CheckCircle', color: 'ok' }] : []),
  ];
  return (
    <Drawer open={!!ticket} onClose={onClose} title={ticket.title}
      subtitle={<>
        <span className="mono">{ticket.id}</span> · {ticket.unit}
      </>}
      footer={<>
        <button className="btn" onClick={onClose}>Cerrar</button>
        {ticket.status !== 'resuelto' && <button className="btn primary" onClick={() => { pushToast({kind:'ok', title:'Estado actualizado'}); onClose(); }}><I.ArrowRight size={13}/>Avanzar estado</button>}
      </>}>
      <div className="row gap-sm" style={{ marginBottom: 18 }}>
        <StatusBadge status={ticket.status}/>
        <span className="badge" style={{ background: ticket.priority==='alta'?'var(--bad-100)':ticket.priority==='media'?'var(--warn-100)':'var(--info-100)', color: ticket.priority==='alta'?'var(--bad-700)':ticket.priority==='media'?'var(--warn-700)':'var(--info-700)' }}>
          <span className="badge-dot"/>Prioridad {ticket.priority}
        </span>
      </div>

      <div className="stripes" style={{ height: 180, marginBottom: 18 }}>foto adjunta</div>

      <div style={{ padding: 14, background: 'var(--surface-muted)', borderRadius: 10, marginBottom: 18, fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5 }}>
        El residente reporta que la situación requiere atención pronta. Se envió cuadrilla de {ticket.assignee.toLowerCase()} para diagnóstico y se programará intervención.
      </div>

      <div className="section-title">Historial</div>
      <div style={{ position: 'relative', paddingLeft: 22 }}>
        <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'var(--border-subtle)' }}/>
        {timeline.map((it, i) => {
          const IC = I[it.icon];
          return (
            <div key={i} style={{ position: 'relative', paddingBottom: 16 }}>
              <div className={`i-round ${it.color}`} style={{ position: 'absolute', left: -22, top: -2, width: 18, height: 18, borderRadius: 999, border: '2px solid var(--bg-elev)', flex: '0 0 18px' }}><IC size={10}/></div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{it.t}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{it.when}</div>
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}

// -------------------- Charge detail drawer --------------------
function ChargeDetailModal({ charge, onClose, pushToast }) {
  if (!charge) return null;
  const heroBg = charge.status==='vencido'?'var(--bad-100)':charge.status==='pagado'?'var(--ok-100)':'var(--warn-100)';
  return (
    <Drawer open={!!charge} onClose={onClose} title={`Cargo ${charge.id}`} subtitle={charge.desc} width={520}
      footer={<>
        <button className="btn" onClick={onClose}>Cerrar</button>
        <button className="btn" onClick={()=>{ pushToast({kind:'info', title:'Recordatorio enviado'}); }}><I.Send size={13}/>Enviar recordatorio</button>
        {charge.status !== 'pagado' && <button className="btn primary" onClick={() => { pushToast({kind:'ok', title:'Marcado como pagado'}); onClose(); }}><I.Check size={13}/>Marcar pagado</button>}
      </>}>
      <div style={{ padding: '20px 22px', background: heroBg, borderRadius: 12, marginBottom: 18 }}>
        <div style={{ fontSize: 14, color:'var(--text-soft)', marginBottom: 4 }}>{charge.desc}</div>
        <div className="mono tabular" style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>{fmtMoney(charge.amount)}</div>
        <div className="row gap-sm" style={{ marginTop: 10 }}>
          <StatusBadge status={charge.status}/>
          <span style={{ fontSize: 12, color:'var(--text-muted)' }}>Vence {fmtDate(charge.dueDate)}</span>
        </div>
      </div>
      <div className="grid cols-2" style={{ gap: 14, marginBottom: 18 }}>
        <div><div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Unidad</div><div className="mono" style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{charge.unit}</div></div>
        <div><div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Residente</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{charge.resident}</div></div>
        <div><div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Mora diaria</div><div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{fmtMoney(charge.lateFee)}/día</div></div>
        <div><div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{charge.status==='pagado'?'Estado':'Días'}</div><div style={{ fontSize: 14, fontWeight: 600, marginTop: 2, color: charge.status==='vencido'?'var(--bad-700)':'inherit' }}>{charge.status==='pagado'?'Cubierto':charge.daysLeft>=0?`en ${charge.daysLeft} días`:`${Math.abs(charge.daysLeft)} d mora`}</div></div>
      </div>
      <div className="section-title">Historial</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: 14, background: 'var(--surface-muted)', borderRadius: 10 }}>
        Cargo generado el {fmtDate(charge.dueDate)}. Sin movimientos registrados.
      </div>
    </Drawer>
  );
}

// -------------------- Receipt viewer drawer --------------------
function ReceiptModal({ payment, onClose, pushToast }) {
  if (!payment) return null;
  return (
    <Drawer open={!!payment} onClose={onClose} title="Comprobante de pago"
      subtitle={<><span className="mono">{payment.id}</span> · {payment.resident}</>} width={520}
      footer={<>
        <button className="btn" onClick={onClose}>Cerrar</button>
        {payment.status === 'revisión' && <>
          <button className="btn danger-soft" onClick={()=>{ pushToast({kind:'bad', title:'Pago rechazado'}); onClose(); }}><I.X size={13}/>Rechazar</button>
          <button className="btn primary" onClick={()=>{ pushToast({kind:'ok', title:'Pago aprobado'}); onClose(); }}><I.Check size={13}/>Aprobar</button>
        </>}
      </>}>
      <div className="stripes" style={{ height: 260, borderRadius: 10, marginBottom: 18 }}>recibo_<span className="mono">{payment.id}</span>.jpg</div>
      <div style={{ padding: 16, background: 'var(--surface-muted)', borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Monto</div>
        <div className="mono tabular" style={{ fontSize: 36, fontWeight: 600, letterSpacing:'-0.02em' }}>{fmtMoney(payment.amount)}</div>
        <div style={{ marginTop: 8 }}><StatusBadge status={payment.status}/></div>
      </div>
      <div className="stack-sm" style={{ fontSize: 13 }}>
        <div className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}><span style={{ color:'var(--text-muted)' }}>Método</span><strong>{payment.method}</strong></div>
        <div className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}><span style={{ color:'var(--text-muted)' }}>Cargo asociado</span><span className="mono">{payment.charge}</span></div>
        <div className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}><span style={{ color:'var(--text-muted)' }}>Recibido</span><span>{payment.when}</span></div>
      </div>
    </Drawer>
  );
}

// ==================== CREATION DRAWERS ====================

function FieldGroup({ label, children }) {
  return <div className="field"><label className="field-label">{label}</label>{children}</div>;
}
function Section({ title, children }) {
  return <div style={{ marginBottom: 18 }}><div className="section-title" style={{ marginTop: 0 }}>{title}</div><div className="stack">{children}</div></div>;
}

// -------------------- New Resident --------------------
function NewResidentDrawer({ open, onClose, pushToast }) {
  const [role, setRole] = React.useState('Principal');
  const [unit, setUnit] = React.useState('D-204');
  const [active, setActive] = React.useState(true);
  if (!open) return null;
  return (
    <Drawer open={open} onClose={onClose} title="Nuevo residente" subtitle="Registre a un nuevo habitante del condominio" width={520}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={()=>{ pushToast({kind:'ok', title:'Residente creado'}); onClose(); }}><I.Check size={13}/>Crear residente</button>
      </>}>
      <Section title="Identificación">
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Nombre(s)"><input className="input" placeholder="Carolina"/></FieldGroup>
          <FieldGroup label="Apellidos"><input className="input" placeholder="Herrera Muñoz"/></FieldGroup>
        </div>
        <FieldGroup label="Correo electrónico"><input className="input" type="email" placeholder="correo@ejemplo.com"/></FieldGroup>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Teléfono"><input className="input" placeholder="+52 55 1234 5678"/></FieldGroup>
          <FieldGroup label="RFC / ID (opcional)"><input className="input" placeholder="HEMC890214..."/></FieldGroup>
        </div>
      </Section>
      <Section title="Asignación">
        <FieldGroup label="Unidad">
          <select className="select" value={unit} onChange={(e)=>setUnit(e.target.value)}>
            {MOCK.units.map(u => <option key={u.id}>{u.code}</option>)}
          </select>
        </FieldGroup>
        <FieldGroup label="Rol en la unidad">
          <div className="row gap-sm" style={{ flexWrap:'wrap' }}>
            {['Principal','Familiar','Inquilino'].map(r => (
              <button key={r} className={`chip ${role===r?'on':''}`} onClick={()=>setRole(r)}>{r}</button>
            ))}
          </div>
        </FieldGroup>
      </Section>
      <Section title="Estado">
        <div className="row gap-sm" style={{ padding: 12, background: 'var(--surface-muted)', borderRadius: 10 }}>
          <button className={`switch ${active?'on':''}`} onClick={()=>setActive(!active)}/>
          <div className="grow">
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{active?'Activo':'Inactivo'}</div>
            <div style={{ fontSize: 12, color:'var(--text-muted)' }}>Un residente activo puede iniciar sesión y recibir notificaciones</div>
          </div>
        </div>
      </Section>
    </Drawer>
  );
}

// -------------------- New Unit --------------------
function NewUnitDrawer({ open, onClose, pushToast }) {
  const [type, setType] = React.useState('Departamento');
  if (!open) return null;
  const types = [
    { v:'Departamento', icon:'Building', color:'var(--info-500)' },
    { v:'Casa', icon:'Home', color:'var(--ok-500)' },
    { v:'Local', icon:'Store', color:'var(--accent-strong)' },
  ];
  return (
    <Drawer open={open} onClose={onClose} title="Nueva unidad" subtitle="Registre un nuevo inmueble del condominio" width={520}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={()=>{ pushToast({kind:'ok', title:'Unidad creada'}); onClose(); }}><I.Check size={13}/>Crear unidad</button>
      </>}>
      <Section title="Tipo de unidad">
        <div className="grid cols-3" style={{ gap: 10 }}>
          {types.map(t => {
            const IC = I[t.icon] || I.Building;
            return (
              <button key={t.v} onClick={()=>setType(t.v)}
                style={{ padding: 16, borderRadius: 10, border: `1.5px solid ${type===t.v?t.color:'var(--border)'}`, background: type===t.v?`color-mix(in oklch, ${t.color} 10%, var(--bg-elev))`:'var(--bg-elev)', cursor:'pointer', textAlign:'center', transition:'all .15s' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: t.color, color:'white', display:'grid', placeItems:'center', margin:'0 auto 6px' }}><IC size={18}/></div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.v}</div>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Identificación">
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Código"><input className="input mono" placeholder="A-301"/></FieldGroup>
          <FieldGroup label="Máx. residentes"><input className="input" type="number" defaultValue={5} min={1} max={10}/></FieldGroup>
        </div>
        <FieldGroup label="Descripción"><input className="input" placeholder="Torre A · Piso 3"/></FieldGroup>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Superficie (m²)"><input className="input" type="number" placeholder="85"/></FieldGroup>
          <FieldGroup label="Cuota mensual"><input className="input" type="number" placeholder="3500"/></FieldGroup>
        </div>
      </Section>
    </Drawer>
  );
}

// -------------------- New Charge --------------------
function NewChargeDrawer({ open, onClose, pushToast }) {
  const [applyTo, setApplyTo] = React.useState('unidad');
  if (!open) return null;
  return (
    <Drawer open={open} onClose={onClose} title="Nuevo cargo" subtitle="Genere un cargo individual o masivo" width={540}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={()=>{ pushToast({kind:'ok', title:'Cargo generado'}); onClose(); }}><I.Check size={13}/>Generar cargo</button>
      </>}>
      <Section title="Aplicar a">
        <div className="grid cols-3" style={{ gap: 8 }}>
          {[{v:'unidad',l:'Una unidad'},{v:'torre',l:'Una torre'},{v:'todos',l:'Todo el condominio'}].map(o => (
            <button key={o.v} className={`chip ${applyTo===o.v?'on':''}`} onClick={()=>setApplyTo(o.v)} style={{ justifyContent:'center' }}>{o.l}</button>
          ))}
        </div>
        {applyTo==='unidad' && <FieldGroup label="Unidad"><select className="select">{MOCK.units.map(u=><option key={u.id}>{u.code}</option>)}</select></FieldGroup>}
        {applyTo==='torre' && <FieldGroup label="Torre"><select className="select"><option>Torre A</option><option>Torre B</option><option>Torre D</option></select></FieldGroup>}
      </Section>
      <Section title="Detalles del cargo">
        <FieldGroup label="Descripción"><input className="input" placeholder="Cuota de mantenimiento abril"/></FieldGroup>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Monto"><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontWeight:600 }}>$</span><input className="input mono" style={{ paddingLeft: 22 }} placeholder="3,500.00"/></div></FieldGroup>
          <FieldGroup label="Divisa"><select className="select"><option>MXN</option><option>USD</option></select></FieldGroup>
        </div>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Fecha límite"><input className="input" type="date" defaultValue="2026-05-05"/></FieldGroup>
          <FieldGroup label="Mora por día"><input className="input mono" placeholder="50.00"/></FieldGroup>
        </div>
      </Section>
      <div className="row gap-sm" style={{ padding: 10, background: 'var(--primary-soft)', borderRadius: 8, fontSize: 12.5 }}>
        <I.Info size={14} style={{ color: 'var(--primary)' }}/>
        <span style={{ color: 'var(--text-soft)' }}>Se notificará por correo a cada residente asociado.</span>
      </div>
    </Drawer>
  );
}

// -------------------- New Payment --------------------
function NewPaymentDrawer({ open, onClose, pushToast }) {
  const [method, setMethod] = React.useState('Transferencia');
  if (!open) return null;
  return (
    <Drawer open={open} onClose={onClose} title="Registrar pago" subtitle="Aplique un pago a un cargo existente" width={540}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={()=>{ pushToast({kind:'ok', title:'Pago registrado', msg:'Queda pendiente de aprobación'}); onClose(); }}><I.Check size={13}/>Registrar pago</button>
      </>}>
      <Section title="Cargo a cubrir">
        <FieldGroup label="Unidad"><select className="select">{MOCK.units.map(u=><option key={u.id}>{u.code}</option>)}</select></FieldGroup>
        <FieldGroup label="Cargo"><select className="select">{MOCK.charges.filter(c=>c.status!=='pagado').map(c=><option key={c.id}>{c.id} — {c.desc} ({fmtMoney(c.amount)})</option>)}</select></FieldGroup>
      </Section>
      <Section title="Pago">
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Monto"><div style={{ position:'relative' }}><span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontWeight:600 }}>$</span><input className="input mono" style={{ paddingLeft: 22 }} placeholder="3,500.00"/></div></FieldGroup>
          <FieldGroup label="Divisa"><select className="select"><option>MXN</option><option>USD</option></select></FieldGroup>
        </div>
        <FieldGroup label="Método">
          <div className="row gap-sm" style={{ flexWrap:'wrap' }}>
            {['Transferencia','Efectivo','Depósito','Tarjeta'].map(m => (
              <button key={m} className={`chip ${method===m?'on':''}`} onClick={()=>setMethod(m)}>{m}</button>
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label="Fecha"><input className="input" type="date" defaultValue="2026-04-23"/></FieldGroup>
      </Section>
      <Section title="Comprobante">
        <div style={{ padding: 24, border: '2px dashed var(--border)', borderRadius: 12, textAlign:'center', background: 'var(--surface-muted)' }}>
          <I.Upload size={24} style={{ color: 'var(--text-muted)', marginBottom: 6 }}/>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Arrastre el comprobante aquí</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>JPG, PNG o PDF — máx. 5 MB</div>
          <button className="btn sm">Seleccionar archivo</button>
        </div>
      </Section>
    </Drawer>
  );
}

// -------------------- New Maintenance Ticket --------------------
function NewTicketDrawer({ open, onClose, pushToast }) {
  const [prio, setPrio] = React.useState('media');
  const [cat, setCat] = React.useState('Plomería');
  if (!open) return null;
  return (
    <Drawer open={open} onClose={onClose} title="Nuevo reporte" subtitle="Describa la situación a atender" width={520}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={()=>{ pushToast({kind:'ok', title:'Reporte creado', msg:'Asignado al equipo correspondiente'}); onClose(); }}><I.Check size={13}/>Crear reporte</button>
      </>}>
      <Section title="Tipo y prioridad">
        <FieldGroup label="Categoría">
          <div className="row gap-sm" style={{ flexWrap:'wrap' }}>
            {['Plomería','Electricidad','Áreas comunes','Cerrajería','Limpieza','Otro'].map(c => (
              <button key={c} className={`chip ${cat===c?'on':''}`} onClick={()=>setCat(c)}>{c}</button>
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label="Prioridad">
          <div className="grid cols-3" style={{ gap: 8 }}>
            {[{v:'baja',c:'var(--info-500)'},{v:'media',c:'var(--warn-500)'},{v:'alta',c:'var(--bad-500)'}].map(p => (
              <button key={p.v} onClick={()=>setPrio(p.v)}
                style={{ padding: 10, borderRadius: 10, border: `1.5px solid ${prio===p.v?p.c:'var(--border)'}`, background: prio===p.v?`color-mix(in oklch, ${p.c} 10%, var(--bg-elev))`:'var(--bg-elev)', cursor:'pointer', textAlign:'center', fontSize: 13, fontWeight: 600, textTransform:'capitalize' }}>
                <span style={{ display:'inline-block', width:8, height:8, borderRadius:999, background:p.c, marginRight: 6, verticalAlign:'middle' }}/>
                {p.v}
              </button>
            ))}
          </div>
        </FieldGroup>
      </Section>
      <Section title="Detalles">
        <FieldGroup label="Título"><input className="input" placeholder="Fuga en tubería..."/></FieldGroup>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Unidad / Área"><select className="select"><option>Área común</option>{MOCK.units.map(u=><option key={u.id}>{u.code}</option>)}</select></FieldGroup>
          <FieldGroup label="Reportado por"><input className="input" placeholder="Nombre del residente"/></FieldGroup>
        </div>
        <FieldGroup label="Descripción"><textarea className="textarea" rows={4} placeholder="Describa con detalle la situación..."/></FieldGroup>
      </Section>
      <Section title="Foto (opcional)">
        <div style={{ padding: 20, border: '2px dashed var(--border)', borderRadius: 12, textAlign:'center', background: 'var(--surface-muted)' }}>
          <I.Image size={22} style={{ color: 'var(--text-muted)', marginBottom: 6 }}/>
          <div style={{ fontSize: 12.5, color:'var(--text-muted)' }}>Adjunte una foto para facilitar el diagnóstico</div>
        </div>
      </Section>
    </Drawer>
  );
}

// -------------------- Reservation (convert to Drawer) --------------------
function ReservationModal({ open, onClose, pushToast }) {
  const [amenity, setAmenity] = React.useState('Salón de eventos');
  const [date, setDate] = React.useState('2026-04-26');
  const [slot, setSlot] = React.useState('17:00');
  if (!open) return null;
  const slots = ['08:00','10:00','12:00','14:00','17:00','19:00','21:00'];
  return (
    <Drawer open={open} onClose={onClose} title="Nueva reservación" subtitle="Seleccione amenidad, fecha y horario" width={520}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={()=>{ pushToast({kind:'ok', title:'Reservación enviada', msg:`${amenity} · ${date} ${slot}`}); onClose(); }}>Confirmar reservación</button>
      </>}>
      <Section title="Amenidad">
        <div className="row gap-sm" style={{ flexWrap: 'wrap' }}>
          {MOCK.amenities.map(a => (
            <button key={a} className={`chip ${amenity===a?'on':''}`} onClick={()=>setAmenity(a)}>{a}</button>
          ))}
        </div>
      </Section>
      <Section title="Fecha y unidad">
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Fecha"><input type="date" className="input" value={date} onChange={(e)=>setDate(e.target.value)}/></FieldGroup>
          <FieldGroup label="Unidad"><select className="select"><option>D-204</option><option>A-102</option></select></FieldGroup>
        </div>
      </Section>
      <Section title="Horario disponible">
        <div className="row gap-sm" style={{ flexWrap:'wrap' }}>
          {slots.map(s => (
            <button key={s} className={`chip mono ${slot===s?'on':''}`} onClick={()=>setSlot(s)}>{s}</button>
          ))}
        </div>
      </Section>
      <FieldGroup label="Notas (opcional)"><textarea className="textarea" placeholder="Cualquier comentario para administración..."/></FieldGroup>
      <div className="row gap-sm" style={{ padding: 10, background: 'var(--primary-soft)', borderRadius: 8, fontSize: 12.5, marginTop: 12 }}>
        <I.Info size={14} style={{ color: 'var(--primary)' }}/>
        <span style={{ color: 'var(--text-soft)' }}>Cargo por uso: <strong>{fmtMoney(800)}</strong> (se factura al confirmar)</span>
      </div>
    </Drawer>
  );
}

// -------------------- New Tenant (Condominio) --------------------
function NewTenantDrawer({ open, onClose, pushToast }) {
  const [plan, setPlan] = React.useState('Pro');
  if (!open) return null;
  return (
    <Drawer open={open} onClose={onClose} title="Nuevo condominio" subtitle="Dé de alta una nueva organización en la plataforma" width={540}
      footer={<>
        <button className="btn" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={()=>{ pushToast({kind:'ok', title:'Condominio creado'}); onClose(); }}><I.Check size={13}/>Crear condominio</button>
      </>}>
      <Section title="Identidad">
        <div className="row gap-sm" style={{ alignItems:'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: 'var(--primary)', color: 'white', display:'grid', placeItems:'center', fontFamily:'var(--font-display)', fontSize: 28 }}>M</div>
          <div className="grow">
            <button className="btn sm"><I.Upload size={13}/>Subir logo</button>
            <div style={{ fontSize: 11.5, color:'var(--text-muted)', marginTop: 4 }}>PNG o SVG, mínimo 256×256 px</div>
          </div>
        </div>
        <FieldGroup label="Nombre del condominio"><input className="input" placeholder="Residencial Los Sauces"/></FieldGroup>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Slug / Subdominio"><div style={{ position:'relative' }}><input className="input mono" placeholder="los-sauces" style={{ paddingRight: 100 }}/><span style={{ position:'absolute', right: 10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize: 12 }}>.macacos.app</span></div></FieldGroup>
          <FieldGroup label="RFC / Tax ID"><input className="input mono" placeholder="XAXX010101000"/></FieldGroup>
        </div>
      </Section>
      <Section title="Administrador principal">
        <div className="grid cols-2" style={{ gap: 12 }}>
          <FieldGroup label="Nombre"><input className="input" placeholder="María García"/></FieldGroup>
          <FieldGroup label="Correo"><input className="input" type="email" placeholder="admin@..."/></FieldGroup>
        </div>
      </Section>
      <Section title="Plan">
        <div className="grid cols-3" style={{ gap: 8 }}>
          {[
            { v:'Básico', price:'$999', u:'Hasta 50 unidades' },
            { v:'Pro', price:'$2,499', u:'Hasta 200 unidades' },
            { v:'Enterprise', price:'A medida', u:'Ilimitado' },
          ].map(p => (
            <button key={p.v} onClick={()=>setPlan(p.v)}
              style={{ padding: 14, borderRadius: 10, border: `1.5px solid ${plan===p.v?'var(--primary)':'var(--border)'}`, background: plan===p.v?'var(--primary-soft)':'var(--bg-elev)', cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{p.v}</div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--primary)' }}>{p.price}</div>
              <div style={{ fontSize: 11, color:'var(--text-muted)', marginTop: 2 }}>{p.u}</div>
            </button>
          ))}
        </div>
      </Section>
    </Drawer>
  );
}

// -------------------- Resident detail drawer --------------------
function ResidentDrawer({ resident, onClose, pushToast }) {
  if (!resident) return null;
  const r = resident;
  const charges = MOCK.charges.filter(c => c.resident && c.resident.includes(r.name.split(' ')[0]));
  return (
    <Drawer open={!!r} onClose={onClose} title={r.name} subtitle={`${r.role} · ${r.unit}`} width={480}
      footer={<>
        <button className="btn" onClick={onClose}>Cerrar</button>
        <button className="btn"><I.Mail size={13}/>Enviar mensaje</button>
        <button className="btn primary"><I.Edit size={13}/>Editar</button>
      </>}>
      <div className="row gap" style={{ marginBottom: 18 }}>
        <div className="avatar lg" style={{ width: 72, height: 72, fontSize: 26 }}>{r.name.split(' ').map(s=>s[0]).slice(0,2).join('')}</div>
        <div className="grow">
          <div className="row gap-sm" style={{ marginBottom: 6 }}>
            <span className={`badge ${r.active?'ok':''}`}><span className="badge-dot"/>{r.active?'Activo':'Inactivo'}</span>
            <span className="badge info"><span className="badge-dot"/>{r.role}</span>
          </div>
          <div style={{ fontSize: 13, color:'var(--text-muted)' }}>Miembro desde {r.since}</div>
        </div>
      </div>
      <Section title="Contacto">
        <div className="stack-sm" style={{ fontSize: 13 }}>
          <div className="row gap-sm"><I.Phone size={14} style={{ color:'var(--text-muted)' }}/><span>{r.phone}</span></div>
          <div className="row gap-sm"><I.Mail size={14} style={{ color:'var(--text-muted)' }}/><span>{r.name.split(' ')[0].toLowerCase()}@correo.com</span></div>
          <div className="row gap-sm"><I.Home size={14} style={{ color:'var(--text-muted)' }}/><span className="mono">{r.unit}</span></div>
        </div>
      </Section>
      <Section title="Cargos recientes">
        {charges.length === 0 ? (
          <div style={{ padding: 18, textAlign:'center', color:'var(--text-muted)', background:'var(--surface-muted)', borderRadius: 10, fontSize: 13 }}>Sin cargos registrados</div>
        ) : charges.slice(0,4).map(c => (
          <div key={c.id} className="row gap" style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="grow">
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.desc}</div>
              <div className="mono" style={{ fontSize: 11.5, color:'var(--text-muted)' }}>{c.id}</div>
            </div>
            <div className="mono tabular" style={{ fontSize: 13.5, fontWeight: 600 }}>{fmtMoney(c.amount)}</div>
            <StatusBadge status={c.status}/>
          </div>
        ))}
      </Section>
    </Drawer>
  );
}

Object.assign(window, { Drawer, UnitDrawer, TicketDrawer, ChargeDetailModal, ReservationModal, ReceiptModal, NewResidentDrawer, NewUnitDrawer, NewChargeDrawer, NewPaymentDrawer, NewTicketDrawer, NewTenantDrawer, ResidentDrawer });

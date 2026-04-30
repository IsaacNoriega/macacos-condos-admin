/* global React, I, MOCK, fmtMoney, fmtDate, StatusBadge */
const { useState: useS4, useMemo: useM4 } = React;

// ============ CHARGES ============
function ChargesPage({ role, pushToast }) {
  const [status, setStatus] = useS4('todos');
  const [selected, setSelected] = useS4([]);
  const [showForm, setShowForm] = useS4(false);
  const [detail, setDetail] = useS4(null);
  const charges = MOCK.charges.filter(c => status==='todos' || c.status===status);
  const totals = {
    total: MOCK.charges.reduce((s,c)=>s+c.amount,0),
    vencido: MOCK.charges.filter(c=>c.status==='vencido').reduce((s,c)=>s+c.amount,0),
    pendiente: MOCK.charges.filter(c=>c.status==='pendiente').reduce((s,c)=>s+c.amount,0),
  };

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);
  const allSel = selected.length === charges.length && charges.length > 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Cargos</h1>
          <p className="page-sub">{MOCK.charges.length} cargos · {fmtMoney(totals.total)} en cobro</p>
        </div>
        <div className="row gap-sm">
          <button className="btn"><I.Download size={15}/>Exportar</button>
          <button className="btn primary" onClick={()=>setShowForm(true)}><I.Plus size={15}/>Nuevo cargo</button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <StatStrip icon="Receipt" color="navy" label="En cobro este mes" value={fmtMoney(totals.total)} sub={`${MOCK.charges.length} cargos`}/>
        <StatStrip icon="Clock" color="warn" label="Pendientes" value={fmtMoney(totals.pendiente)} sub={`${MOCK.charges.filter(c=>c.status==='pendiente').length} cargos`}/>
        <StatStrip icon="AlertTri" color="bad" label="Vencidos" value={fmtMoney(totals.vencido)} sub={`${MOCK.charges.filter(c=>c.status==='vencido').length} con mora`}/>
      </div>

      <NewChargeDrawer open={showForm} onClose={()=>setShowForm(false)} pushToast={pushToast}/>

      {/* Filters */}
      <div className="row between" style={{ marginBottom: 14 }}>
        <div className="row gap-sm">
          {[['todos','Todos'],['pendiente','Pendientes'],['pagado','Pagados'],['vencido','Vencidos']].map(([k,v]) => (
            <button key={k} className={`chip ${status===k?'on':''}`} onClick={()=>setStatus(k)}>{v}</button>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="row gap-sm">
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{selected.length} seleccionado{selected.length>1?'s':''}</span>
            <button className="btn sm"><I.Download size={13}/>Exportar selección</button>
            <button className="btn sm"><I.Send size={13}/>Enviar recordatorio</button>
          </div>
        )}
      </div>

      {/* Charge cards */}
      <div className="stack-sm">
        <div className="row gap" style={{ padding: '6px 16px', fontSize: 11, color: 'var(--text-faint)', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
          <button className={`check ${allSel?'on':''}`} onClick={() => setSelected(allSel ? [] : charges.map(c=>c.id))}>{allSel && <I.Check size={11}/>}</button>
          <div style={{ width: 76 }}>ID</div>
          <div className="grow">Concepto</div>
          <div style={{ width: 110 }}>Vencimiento</div>
          <div style={{ width: 130, textAlign: 'right' }}>Monto</div>
          <div style={{ width: 110 }}>Estado</div>
          <div style={{ width: 30 }}></div>
        </div>
        {charges.map(c => (
          <ChargeRow key={c.id} c={c} selected={selected.includes(c.id)} onToggle={()=>toggle(c.id)} onOpen={()=>setDetail(c)} pushToast={pushToast}/>
        ))}
      </div>
      <ChargeDetailModal charge={detail} onClose={()=>setDetail(null)} pushToast={pushToast}/>
    </div>
  );
}

function StatStrip({ icon, color, label, value, sub }) {
  const IC = I[icon];
  return (
    <div className="card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
      <div className={`i-round ${color}`}><IC size={18}/></div>
      <div className="grow">
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
        <div className="mono tabular" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{value}</div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{sub}</div>
    </div>
  );
}

function ChargeRow({ c, selected, onToggle, onOpen, pushToast }) {
  const statusColor = c.status === 'pagado' ? 'ok' : c.status === 'vencido' ? 'bad' : 'warn';
  const dayText = c.status === 'pagado' ? 'Cubierto' : c.daysLeft >= 0 ? `en ${c.daysLeft} días` : `${Math.abs(c.daysLeft)} días mora`;
  return (
    <div className="card hoverable" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, borderLeft: `3px solid ${c.status==='vencido'?'var(--bad-500)':c.status==='pendiente'?'var(--warn-500)':'var(--ok-500)'}`, cursor: 'pointer' }} onClick={onOpen}>
      <button className={`check ${selected?'on':''}`} onClick={(e)=>{e.stopPropagation();onToggle();}}>{selected && <I.Check size={11}/>}</button>
      <div style={{ width: 76 }} className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.id}</div>
      <div className="grow" style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{c.desc}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.resident} · <span className="mono">{c.unit}</span></div>
      </div>
      <div style={{ width: 110 }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>{fmtDate(c.dueDate)}</div>
        <div style={{ fontSize: 11.5, color: c.status==='vencido'?'var(--bad-700)':'var(--text-faint)' }}>{dayText}</div>
      </div>
      <div style={{ width: 130, textAlign: 'right' }}>
        <div className="mono tabular" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{fmtMoney(c.amount)}</div>
        {c.status==='vencido' && <div style={{ fontSize: 10.5, color: 'var(--bad-700)' }}>+{fmtMoney(c.lateFee)}/día</div>}
      </div>
      <div style={{ width: 110 }}><StatusBadge status={c.status}/></div>
      <button className="btn sm icon-only ghost" onClick={(e)=>{e.stopPropagation(); pushToast({kind:'info', title: `Cargo ${c.id}`});}}><I.MoreV size={14}/></button>
    </div>
  );
}

window.ChargesPage = ChargesPage;

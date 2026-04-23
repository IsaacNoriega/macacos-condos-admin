/* global React, I, MOCK, fmtMoney, fmtDate, StatusBadge */
const { useState: useS5 } = React;

// ============ PAYMENTS (dual view) ============
function PaymentsPage({ role, pushToast }) {
  if (role === 'Residente') return <PaymentsResident pushToast={pushToast}/>;
  return <PaymentsAdmin pushToast={pushToast}/>;
}

function PaymentsResident({ pushToast }) {
  const pending = MOCK.charges.filter(c => c.status !== 'pagado' && c.resident === 'Daniela Ríos');
  const total = pending.reduce((s,c)=>s+c.amount,0);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Mis pagos</h1>
          <p className="page-sub">Bienvenida, Daniela · Unidad D-204</p>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 20, background: 'linear-gradient(135deg, var(--primary), var(--brand-navy-600))', color: 'white', border: 'none' }}>
        <div className="row between" style={{ alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize: 12.5, opacity: 0.78, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Saldo por pagar</div>
            <div className="mono tabular" style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4, lineHeight: 1 }}>{fmtMoney(total)}</div>
            <div style={{ fontSize: 13, opacity: 0.78, marginTop: 6 }}>{pending.length} cargos abiertos</div>
          </div>
          <div className="row gap-sm">
            <button className="btn" style={{ background: 'white', color: 'var(--brand-navy-800)', borderColor: 'white' }}><I.Card size={14}/>Pagar todo con Stripe</button>
          </div>
        </div>
      </div>

      <div className="section-title">Cargos pendientes</div>
      <div className="stack">
        {pending.length === 0 ? (
          <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>Está al corriente. ✓</div>
        ) : pending.map(c => (
          <div key={c.id} className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '1fr auto', gap: 20 }}>
              <div>
                <div className="row gap-sm" style={{ marginBottom: 8 }}>
                  <StatusBadge status={c.status}/>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }} className="mono">{c.id}</span>
                </div>
                <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{c.desc}</div>
                <div className="row gap" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  <span className="row gap-sm"><I.Calendar size={13}/>Vence {fmtDate(c.dueDate)}</span>
                  <span className="row gap-sm"><I.Clock size={13}/>{c.daysLeft>=0 ? `en ${c.daysLeft} días` : `${Math.abs(c.daysLeft)} días de mora`}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono tabular" style={{ fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1 }}>{fmtMoney(c.amount)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>MXN</div>
              </div>
            </div>
            <div style={{ padding: '12px 18px', background: 'var(--surface-muted)', borderTop: '1px solid var(--border-subtle)', display:'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn sm"><I.Upload size={13}/>Subir comprobante</button>
              <button className="btn sm primary" onClick={()=>pushToast({kind:'info', title:'Redirigiendo a Stripe...'})}><I.Card size={13}/>Pagar con Stripe</button>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title" style={{ marginTop: 28 }}>Comprobante de pago</div>
      <DropZone pushToast={pushToast}/>
    </div>
  );
}

function DropZone({ pushToast }) {
  const [drag, setDrag] = useS5(false);
  const [file, setFile] = useS5(null);
  return (
    <div
      onDragOver={(e)=>{e.preventDefault();setDrag(true);}}
      onDragLeave={()=>setDrag(false)}
      onDrop={(e)=>{e.preventDefault();setDrag(false);setFile('comprobante.jpg');pushToast({kind:'ok',title:'Archivo cargado'});}}
      className="card" style={{ padding: 28, textAlign: 'center', borderStyle: 'dashed', borderColor: drag?'var(--primary)':'var(--border-strong)', background: drag?'var(--primary-soft)':'var(--surface)' }}>
      {!file ? (
        <>
          <I.Upload size={26} style={{ color: 'var(--text-muted)', marginBottom: 8 }}/>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Arrastre aquí su comprobante</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>o <span className="link">seleccione un archivo</span> · JPG, PNG o PDF, máx. 5 MB</div>
        </>
      ) : (
        <div className="row gap" style={{ justifyContent: 'center' }}>
          <div className="i-round ok"><I.CheckCircle size={18}/></div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600 }}>{file}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>340 KB · listo para enviar</div>
          </div>
          <button className="btn sm" onClick={()=>setFile(null)}>Quitar</button>
        </div>
      )}
    </div>
  );
}

function PaymentsAdmin({ pushToast }) {
  const [filter, setFilter] = useS5('todos');
  const [receipt, setReceipt] = useS5(null);
  const [newOpen, setNewOpen] = useS5(false);
  const payments = MOCK.payments.filter(p => filter==='todos' || p.status===filter);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Pagos</h1>
          <p className="page-sub">Historial y aprobación de comprobantes</p>
        </div>
        <button className="btn primary" onClick={()=>setNewOpen(true)}><I.Plus size={15}/>Registrar pago manual</button>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <StatStripLocal icon="CheckCircle" color="ok" label="Aprobados hoy" value="8" sub={fmtMoney(19600)}/>
        <StatStripLocal icon="Clock" color="warn" label="Por revisar" value="3" sub="Subidos en 24 h"/>
        <StatStripLocal icon="XCircle" color="bad" label="Rechazados" value="1" sub="Últimas 24 h"/>
      </div>

      <div className="row gap-sm" style={{ marginBottom: 16 }}>
        {[['todos','Todos'],['aprobado','Aprobados'],['revisión','Por revisar'],['rechazado','Rechazados']].map(([k,v]) => (
          <button key={k} className={`chip ${filter===k?'on':''}`} onClick={()=>setFilter(k)}>{v}</button>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Flujo reciente</div>
          <div className="card-sub">Aprobaciones en orden cronológico</div>
        </div>
        <div style={{ padding: '6px 0 6px' }}>
          {payments.map((p,i) => (
            <div key={p.id} className="row gap" style={{ padding: '14px 18px', borderTop: i?'1px solid var(--border-subtle)':'none' }}>
              <div style={{ position: 'relative', paddingLeft: 14 }}>
                <span style={{ position:'absolute', left: 0, top: 4, width: 10, height: 10, borderRadius: 999, background: p.status==='aprobado'?'var(--ok-500)':p.status==='rechazado'?'var(--bad-500)':'var(--warn-500)', boxShadow: '0 0 0 3px var(--surface)' }}/>
                <span style={{ position:'absolute', left: 4, top: 14, bottom: -14, width: 2, background: 'var(--border-subtle)' }}/>
              </div>
              <div className={`avatar sm ${p.status==='aprobado'?'ok':p.status==='rechazado'?'bad':'amber'}`}>
                {p.resident.split(' ').map(s=>s[0]).slice(0,2).join('')}
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row gap-sm">
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{p.resident}</span>
                  <StatusBadge status={p.status}/>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  <span className="mono">{p.id}</span> · {p.method} · Cargo <span className="mono">{p.charge}</span> · {p.when}
                </div>
              </div>
              <div className="mono tabular" style={{ fontSize: 17, fontWeight: 600 }}>{fmtMoney(p.amount)}</div>
              {p.status === 'revisión' ? (
                <div className="row gap-sm">
                  <button className="btn sm" onClick={()=>setReceipt(p)}><I.Eye size={13}/>Ver</button>
                  <button className="btn sm danger-soft" onClick={()=>pushToast({kind:'bad',title:'Pago rechazado'})}><I.X size={13}/>Rechazar</button>
                  <button className="btn sm primary" onClick={()=>pushToast({kind:'ok',title:'Pago aprobado'})}><I.Check size={13}/>Aprobar</button>
                </div>
              ) : (
                <button className="btn sm icon-only ghost" onClick={()=>setReceipt(p)}><I.Eye size={13}/></button>
              )}
            </div>
          ))}
        </div>
      </div>
      <ReceiptModal payment={receipt} onClose={()=>setReceipt(null)} pushToast={pushToast}/>
      <NewPaymentDrawer open={newOpen} onClose={()=>setNewOpen(false)} pushToast={pushToast}/>
    </div>
  );
}

function StatStripLocal({ icon, color, label, value, sub }) {
  const IC = I[icon];
  return (
    <div className="card" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
      <div className={`i-round ${color}`}><IC size={18}/></div>
      <div className="grow">
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
        <div className="mono tabular" style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{sub}</div>
    </div>
  );
}

window.PaymentsPage = PaymentsPage;

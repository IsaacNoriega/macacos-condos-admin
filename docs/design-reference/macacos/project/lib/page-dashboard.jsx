/* global React, I, MOCK, fmtMoney, StatusBadge, SkelRow */
const { useState: useS2, useMemo: useM2 } = React;

// ============ DASHBOARD ============
function DashboardPage({ role, pushToast }) {
  const [tab, setTab] = useS2('trend');
  const [loading, setLoading] = useS2(true);
  React.useEffect(() => { const t = setTimeout(()=>setLoading(false), 500); return ()=>clearTimeout(t); }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Buenas tardes, {MOCK.user[role].name.split(' ')[0]}.</h1>
          <p className="page-sub">Resumen de {MOCK.tenant.name} · abril 2026</p>
        </div>
        <div className="row gap-sm">
          <button className="btn"><I.Download size={15}/>Exportar</button>
          <button className="btn primary"><I.Plus size={15}/>Nuevo cargo</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid cols-4" style={{ marginBottom: 20 }}>
        {MOCK.kpis.map((k, idx) => <KpiCard key={k.id} k={k} loading={loading} idx={idx}/>)}
      </div>

      {/* Quick actions */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(90deg, var(--accent-soft), transparent 70%)' }}>
        <div className="i-round amber"><I.Sparkle size={18}/></div>
        <div className="grow">
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Acciones rápidas</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Atajos para las tareas más frecuentes del mes.</div>
        </div>
        <div className="row gap-sm">
          <button className="btn sm"><I.Receipt size={14}/>Ver cargos pendientes</button>
          <button className="btn sm"><I.Card size={14}/>Pagos por aprobar <span className="badge warn" style={{ height: 18, marginLeft: 4 }}>3</span></button>
          <button className="btn sm"><I.FileText size={14}/>Reporte del mes</button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-head between">
            <div>
              <div className="card-title">Movimiento financiero</div>
              <div className="card-sub">Últimos 6 meses · miles de MXN</div>
            </div>
            <div className="seg">
              <button className={tab==='trend'?'on':''} onClick={()=>setTab('trend')}>Tendencia</button>
              <button className={tab==='cat'?'on':''} onClick={()=>setTab('cat')}>Por categoría</button>
            </div>
          </div>
          <div className="card-body" style={{ height: 280 }}>
            {tab === 'trend' ? <TrendChart/> : <BarsChart/>}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Distribución de cargos</div>
          </div>
          <div className="card-body">
            <DonutChart/>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-head between">
            <div className="card-title">Pagos recientes</div>
            <button className="link" style={{ fontSize: 12 }}>Ver todos</button>
          </div>
          <div style={{ padding: '6px 0' }}>
            {MOCK.payments.slice(0,4).map(p => (
              <div key={p.id} className="row" style={{ padding: '10px 18px', gap: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <div className={`avatar sm ${p.status==='aprobado'?'ok':p.status==='rechazado'?'bad':'amber'}`}>
                  {p.status==='aprobado'? <I.Check size={12}/> : p.status==='rechazado'? <I.X size={12}/> : <I.Clock size={12}/>}
                </div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.resident}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.method} · {p.when}</div>
                </div>
                <div className="mono tabular" style={{ fontSize: 13.5, fontWeight: 600 }}>{fmtMoney(p.amount)}</div>
                <StatusBadge status={p.status}/>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head between">
            <div className="card-title">Reportes abiertos</div>
            <button className="link" style={{ fontSize: 12 }}>Ver todos</button>
          </div>
          <div style={{ padding: '6px 0' }}>
            {MOCK.tickets.filter(t=>t.status!=='resuelto').slice(0,4).map(t => (
              <div key={t.id} className="row" style={{ padding: '10px 18px', gap: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <div className={`i-round ${t.priority==='alta'?'bad':t.priority==='media'?'warn':'info'}`} style={{ width: 30, height: 30, flex: '0 0 30px' }}>
                  <I.Wrench size={14}/>
                </div>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.unit} · {t.opened}</div>
                </div>
                <StatusBadge status={t.status}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ k, loading, idx }) {
  const iconMap = ['DollarSign','Receipt','Building','Wrench'];
  const colors = ['navy','amber','ok','warn'];
  const IC = I[iconMap[idx]];
  return (
    <div className="card hoverable" style={{ padding: 18, display:'flex', flexDirection:'column', gap: 14 }}>
      <div className="row between">
        <div className={`i-round ${colors[idx]}`}><IC size={17}/></div>
        <span className={`badge ${k.trend==='up'?'ok':'bad'}`}>
          {k.trend==='up' ? <I.ArrowUp size={10}/> : <I.ArrowDown size={10}/>}
          {Math.abs(k.delta)}%
        </span>
      </div>
      {loading ? <SkelRow h={28} w="70%"/> : (
        <div>
          <div className="mono tabular" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1 }}>
            {k.currency ? fmtMoney(k.value) : `${k.value}${k.suffix||''}`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{k.label}</div>
        </div>
      )}
      <div style={{ fontSize: 11.5, color: 'var(--text-faint)', borderTop: '1px dashed var(--border-subtle)', paddingTop: 10 }}>{k.sub}</div>
    </div>
  );
}

function TrendChart() {
  const data = MOCK.trend6m;
  const W = 520, H = 230, P = { l: 30, r: 10, t: 10, b: 26 };
  const max = 260;
  const xs = (i) => P.l + (i * (W - P.l - P.r)) / (data.length - 1);
  const ys = (v) => P.t + (1 - v/max) * (H - P.t - P.b);
  const line = (key) => data.map((d,i)=>`${i?'L':'M'}${xs(i)},${ys(d[key])}`).join(' ');
  const area = (key) => `${line(key)} L${xs(data.length-1)},${H-P.b} L${xs(0)},${H-P.b} Z`;

  const [hover, setHover] = useS2(null);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="g-in" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.25"/>
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="g-out" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent-strong)" stopOpacity="0.18"/>
          <stop offset="1" stopColor="var(--accent-strong)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[0, 65, 130, 195, 260].map((v,i) => (
        <g key={i}>
          <line x1={P.l} x2={W-P.r} y1={ys(v)} y2={ys(v)} stroke="var(--border-subtle)" strokeDasharray="2 3"/>
          <text x={8} y={ys(v)+3} fontSize="10" fill="var(--text-faint)">{v}</text>
        </g>
      ))}
      <path d={area('ingresos')} fill="url(#g-in)"/>
      <path d={line('ingresos')} stroke="var(--primary)" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
      <path d={area('gastos')} fill="url(#g-out)"/>
      <path d={line('gastos')} stroke="var(--accent-strong)" strokeWidth="2.2" fill="none" strokeDasharray="4 4" strokeLinecap="round"/>
      {data.map((d,i) => (
        <g key={i}>
          <circle cx={xs(i)} cy={ys(d.ingresos)} r={hover===i?5:3.5} fill="var(--primary)" stroke="var(--bg-elev)" strokeWidth="2"/>
          <circle cx={xs(i)} cy={ys(d.gastos)} r={hover===i?4:3} fill="var(--accent-strong)" stroke="var(--bg-elev)" strokeWidth="2"/>
          <rect x={xs(i)-18} y={P.t} width={36} height={H-P.b-P.t} fill="transparent" onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}/>
          <text x={xs(i)} y={H-8} fontSize="10.5" fill="var(--text-muted)" textAnchor="middle">{d.m}</text>
        </g>
      ))}
      {hover !== null && (() => {
        const d = data[hover];
        return (
          <g>
            <line x1={xs(hover)} x2={xs(hover)} y1={P.t} y2={H-P.b} stroke="var(--border-strong)" strokeDasharray="3 3"/>
            <g transform={`translate(${Math.min(xs(hover)+10, W-120)}, ${P.t+10})`}>
              <rect width="110" height="48" rx="6" fill="var(--bg-elev)" stroke="var(--border)"/>
              <text x="10" y="16" fontSize="11" fill="var(--text-muted)" fontWeight="600">{d.m} 2026</text>
              <circle cx="12" cy="28" r="3" fill="var(--primary)"/>
              <text x="20" y="31" fontSize="10.5" fill="var(--text)">Ingresos ${d.ingresos}k</text>
              <circle cx="12" cy="41" r="3" fill="var(--accent-strong)"/>
              <text x="20" y="44" fontSize="10.5" fill="var(--text)">Gastos ${d.gastos}k</text>
            </g>
          </g>
        );
      })()}
      <g transform={`translate(${W-140},${P.t})`}>
        <circle cx="5" cy="5" r="4" fill="var(--primary)"/><text x="14" y="9" fontSize="11" fill="var(--text-soft)">Ingresos</text>
        <circle cx="72" cy="5" r="4" fill="var(--accent-strong)"/><text x="81" y="9" fontSize="11" fill="var(--text-soft)">Gastos</text>
      </g>
    </svg>
  );
}

function BarsChart() {
  const data = MOCK.categoryBars;
  const W = 520, H = 230, P = { l: 30, r: 10, t: 10, b: 30 };
  const max = 160;
  const bw = 42;
  const gap = ((W-P.l-P.r) - bw*data.length) / (data.length - 1);
  const [hover, setHover] = useS2(null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">
      {[0,40,80,120,160].map((v,i) => (
        <g key={i}>
          <line x1={P.l} x2={W-P.r} y1={P.t + (1-v/max)*(H-P.t-P.b)} y2={P.t + (1-v/max)*(H-P.t-P.b)} stroke="var(--border-subtle)" strokeDasharray="2 3"/>
          <text x={8} y={P.t + (1-v/max)*(H-P.t-P.b)+3} fontSize="10" fill="var(--text-faint)">{v}</text>
        </g>
      ))}
      {data.map((d,i) => {
        const x = P.l + i*(bw+gap);
        const h = (d.value/max)*(H-P.t-P.b);
        const y = H-P.b-h;
        return (
          <g key={d.cat} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}>
            <rect x={x} y={y} width={bw} height={h} rx="6" fill={d.color} opacity={hover===null||hover===i?1:0.4}/>
            <text x={x+bw/2} y={H-10} fontSize="10.5" fill="var(--text-muted)" textAnchor="middle">{d.cat}</text>
            {hover===i && (
              <g>
                <rect x={x+bw/2-34} y={y-26} width="68" height="20" rx="4" fill="var(--bg-elev)" stroke="var(--border)"/>
                <text x={x+bw/2} y={y-12} fontSize="11" fill="var(--text)" textAnchor="middle" fontWeight="600">{d.value}k MXN</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function DonutChart() {
  const data = MOCK.donut;
  const total = data.reduce((s,d)=>s+d.v,0);
  const R = 62, r = 40, cx = 80, cy = 80;
  let acc = 0;
  const arcs = data.map(d => {
    const a0 = (acc/total)*Math.PI*2 - Math.PI/2;
    acc += d.v;
    const a1 = (acc/total)*Math.PI*2 - Math.PI/2;
    const large = (a1-a0) > Math.PI ? 1 : 0;
    const x0 = cx+R*Math.cos(a0), y0 = cy+R*Math.sin(a0);
    const x1 = cx+R*Math.cos(a1), y1 = cy+R*Math.sin(a1);
    const xi0 = cx+r*Math.cos(a0), yi0 = cy+r*Math.sin(a0);
    const xi1 = cx+r*Math.cos(a1), yi1 = cy+r*Math.sin(a1);
    return { d, path: `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${xi1},${yi1} A${r},${r} 0 ${large} 0 ${xi0},${yi0} Z` };
  });
  return (
    <div className="row gap-lg" style={{ alignItems: 'center' }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {arcs.map((a,i) => <path key={i} d={a.path} fill={a.d.color}/>)}
        <text x="80" y="76" fontSize="11" fill="var(--text-muted)" textAnchor="middle">Total</text>
        <text x="80" y="96" fontSize="20" fill="var(--text)" textAnchor="middle" fontWeight="600" fontFamily="var(--font-mono)">{total}%</text>
      </svg>
      <div className="stack-sm" style={{ flex: 1 }}>
        {data.map(d => (
          <div key={d.k} className="row gap-sm" style={{ padding: '8px 10px', background: 'var(--surface-muted)', borderRadius: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }}/>
            <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 500, flex: 1 }}>{d.k}</span>
            <span className="mono tabular" style={{ fontSize: 13, fontWeight: 600 }}>{d.v}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.DashboardPage = DashboardPage;

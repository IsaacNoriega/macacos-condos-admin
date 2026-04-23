/* global React, I, MOCK, fmtMoney, StatusBadge */
const { useState: useS1 } = React;

// ============ LOGIN PAGE ============
function LoginPage({ onLogin }) {
  const [view, setView] = useS1('login'); // login | recover | reset
  const [email, setEmail] = useS1('lucia.m@villaencino.mx');
  const [pwd, setPwd] = useS1('••••••••••');
  const [showPwd, setShowPwd] = useS1(false);
  const [loading, setLoading] = useS1(false);

  const submit = (e) => {
    e?.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin?.(); }, 900);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.05fr 1fr', background: 'var(--bg)' }}>
      {/* Left: brand panel */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(155deg, var(--brand-navy-900), var(--brand-navy-700) 70%, var(--brand-navy-600))',
        color: 'white', padding: '40px 48px', display: 'flex', flexDirection: 'column',
      }}>
        {/* Texture */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity: 0.18 }} preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 800">
          <defs>
            <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="white"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>
        {/* House silhouette */}
        <svg style={{ position:'absolute', right:-60, bottom:-40, opacity: 0.14 }} width="520" height="420" viewBox="0 0 520 420" fill="none">
          <path d="M40 220 L180 100 L320 220 L320 400 L40 400 Z" stroke="white" strokeWidth="2"/>
          <rect x="120" y="280" width="60" height="120" stroke="white" strokeWidth="2"/>
          <rect x="220" y="260" width="60" height="60" stroke="white" strokeWidth="2"/>
          <path d="M320 220 L260 160 L220 200" stroke="white" strokeWidth="2"/>
          <path d="M260 160 L260 100 L300 100 L300 140" stroke="white" strokeWidth="2"/>
          <path d="M320 220 L460 100 L460 400 L320 400" stroke="white" strokeWidth="2"/>
          <rect x="360" y="180" width="50" height="50" stroke="white" strokeWidth="2"/>
          <rect x="360" y="260" width="50" height="50" stroke="white" strokeWidth="2"/>
          <rect x="360" y="340" width="50" height="50" stroke="white" strokeWidth="2"/>
        </svg>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 26, color: 'oklch(0.22 0.05 80)', fontWeight: 500, boxShadow: 'inset 0 -6px 10px oklch(0 0 0 / 0.18)' }}>M</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1, letterSpacing: '-0.02em' }}>Macacos</div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7, marginTop: 3 }}>Condominios · Plataforma</div>
          </div>
        </div>

        <div style={{ position: 'relative', marginTop: 'auto', maxWidth: 440 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 54, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 22 }}>
            La administración<br/>de su condominio,<br/><em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>sin complicaciones.</em>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.55, opacity: 0.82, margin: 0 }}>
            Cobros, reportes de mantenimiento, reservas de amenidades y comunicación con residentes — todo en un solo lugar.
          </p>
        </div>

        <div style={{ position: 'relative', marginTop: 40, display: 'flex', gap: 22, fontSize: 12.5, opacity: 0.7 }}>
          <span>© 2026 Macacos</span>
          <span>·</span>
          <span>v2.4.0</span>
          <span>·</span>
          <span>Hecho con cariño en CDMX</span>
        </div>
      </div>

      {/* Right: form */}
      <div style={{ display: 'grid', placeItems: 'center', padding: 40 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {view === 'login' && (
            <>
              <h1 className="serif" style={{ fontSize: 34, margin: '0 0 6px', color: 'var(--text)', fontWeight: 400, letterSpacing: '-0.02em' }}>Bienvenida de vuelta</h1>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 28px', fontSize: 14 }}>Ingrese sus credenciales para acceder al panel.</p>
              <form onSubmit={submit} className="stack">
                <div className="field">
                  <label className="field-label">Correo electrónico</label>
                  <div className="input-wrap">
                    <span className="input-icon"><I.Mail size={15}/></span>
                    <input className="input with-icon" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} autoFocus/>
                  </div>
                </div>
                <div className="field">
                  <div className="row between">
                    <label className="field-label">Contraseña</label>
                    <span className="link" style={{ fontSize: 12 }} onClick={() => setView('recover')}>¿Olvidó su contraseña?</span>
                  </div>
                  <div className="input-wrap">
                    <span className="input-icon"><I.Lock size={15}/></span>
                    <input className="input with-icon" type={showPwd ? 'text' : 'password'} value={pwd} onChange={(e)=>setPwd(e.target.value)} style={{ paddingRight: 36 }}/>
                    <button type="button" onClick={()=>setShowPwd(s=>!s)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', padding: 6, cursor: 'pointer' }}>
                      {showPwd ? <I.EyeOff size={15}/> : <I.Eye size={15}/>}
                    </button>
                  </div>
                </div>
                <label className="row gap-sm" style={{ fontSize: 13, color: 'var(--text-soft)', cursor: 'pointer' }}>
                  <span className="check on"><I.Check size={12}/></span>
                  Mantener la sesión iniciada
                </label>
                <button className="btn primary lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
                  {loading ? <><span className="btn-spin"/>Ingresando...</> : <>Ingresar <I.ArrowRight size={15}/></>}
                </button>
              </form>
              <div style={{ marginTop: 22, padding: 12, borderRadius: 10, background: 'var(--accent-soft)', display:'flex', gap: 10, alignItems:'flex-start' }}>
                <I.Info size={15} style={{ color: 'var(--accent-strong)', marginTop: 2 }}/>
                <div style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>
                  <strong style={{ color: 'var(--text)' }}>Demo:</strong> cualquier contraseña funciona. El rol se puede cambiar desde el topbar.
                </div>
              </div>
            </>
          )}
          {view === 'recover' && (
            <>
              <h1 className="serif" style={{ fontSize: 32, margin: '0 0 6px', fontWeight: 400, letterSpacing: '-0.02em' }}>Recupere el acceso</h1>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 28px', fontSize: 14 }}>Le enviaremos un enlace para restablecer la contraseña.</p>
              <div className="stack">
                <div className="field">
                  <label className="field-label">Correo electrónico</label>
                  <div className="input-wrap">
                    <span className="input-icon"><I.Mail size={15}/></span>
                    <input className="input with-icon" type="email" defaultValue={email}/>
                  </div>
                </div>
                <button className="btn primary lg" style={{ width: '100%' }}>Enviar enlace <I.Send size={14}/></button>
                <button className="btn ghost" style={{ width: '100%' }} onClick={() => setView('login')}><I.ChevronLeft size={14}/>Volver al inicio de sesión</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

window.LoginPage = LoginPage;

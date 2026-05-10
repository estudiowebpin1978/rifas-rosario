'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import confetti from 'canvas-confetti';

export default function RifaApp() {
  const [boletos, setBoletos] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [config, setConfig] = useState({});
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authData, setAuthData] = useState({ email: '', password: '', nombre: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    checkUser();
    if (!supabase) return;
    fetchData();
    const sub = supabase.channel('cambios').on('postgres_changes', { event: '*', schema: 'public', table: 'boletos' }, handleBoletosUpdate).subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  const checkUser = async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleBoletosUpdate = (payload) => {
    fetchData();
    if (user && payload.eventType !== 'SELECT') {
      showNotification(`Numero ${payload.new?.numero} fue ${payload.new?.estado}`);
    }
  };

  const showNotification = (msg) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('RIFA SMART', { body: msg, icon: '/favicon.ico' });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const fetchData = async () => {
    if (!supabase) return;
    const { data: b } = await supabase.from('boletos').select('*').order('numero', { ascending: true });
    const { data: c } = await supabase.from('comentarios').select('*').order('created_at', { ascending: false }).limit(5);
    const { data: cfg } = await supabase.from('rifa_config').select('*').single();
    setBoletos(b || []);
    setComentarios(c || []);
    setConfig(cfg || {});
    if (cfg?.finalizado) setTimeout(() => confetti(), 300);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError('');

    if (authMode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: authData.email,
        password: authData.password
      });
      if (error) setAuthError(error.message);
      else {
        setUser(await supabase.auth.getUser().then(r => r.data.user));
        setShowAuth(false);
        requestNotificationPermission();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: authData.email,
        password: authData.password,
        options: { data: { nombre: authData.nombre } }
      });
      if (error) setAuthError(error.message);
      else {
        setUser(data.user);
        setShowAuth(false);
        requestNotificationPermission();
      }
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleReserva = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const form = e.target;
    const { error } = await supabase.from('boletos').update({
      estado: 'reservado',
      nombre: form.nombre.value,
      whatsapp: form.whatsapp.value
    }).eq('numero', seleccionado);

    if (!error) {
      await supabase.from('comentarios').insert({
        nombre: form.nombre.value,
        mensaje: `reservo el #${seleccionado}`
      });
      const msg = `Hola! Reserve el #${seleccionado}. Mi nombre es ${form.nombre.value}.`;
      const telefono = config.telefono_whatsapp || '5493410000000';
      window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(msg)}`);
      setSeleccionado(null);
    }
    setLoading(false);
  };

  const shareApp = async () => {
    const url = window.location.href;
    const text = `Participa en la Rifa! ${config.titulo || 'RIFA SMART'}`;
    if (navigator.share) {
      await navigator.share({ title: 'RIFA SMART', text, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  const vendidosCount = boletos.filter(b => b.estado === 'vendido').length;
  const porcentaje = boletos.length > 0 ? Math.round((vendidosCount / boletos.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-cyan-50 pb-20 font-sans text-slate-900">
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-40 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-emerald-600 tracking-tight">RIFA SMART</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{config.titulo}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={shareApp} className="p-2 bg-emerald-100 rounded-full hover:bg-emerald-200 transition-colors" title="Compartir">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            {user ? (
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.email?.[0]?.toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-600 hidden sm:inline">Salir</span>
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-xs font-bold">Ingresar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-white rounded-3xl p-5 shadow-lg shadow-emerald-100 border border-emerald-100">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-emerald-600 text-xs font-bold uppercase">Progreso</p>
              <h2 className="text-4xl font-black text-emerald-600">{porcentaje}%</h2>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs">Solo faltan</p>
              <p className="text-lg font-black text-slate-700">{boletos.filter(b => b.estado === 'disponible').length}</p>
            </div>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-4 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-1000" style={{ width: `${porcentaje}%` }}></div>
          </div>
          <div className="flex justify-center gap-4 mt-3 text-xs font-medium text-slate-500">
            <span><span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>Vendidos: {vendidosCount}</span>
            <span><span className="inline-block w-2 h-2 bg-amber-400 rounded-full mr-1"></span>Reservados: {boletos.filter(b => b.estado === 'reservado').length}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-lg border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase mb-3 text-center">Elegi tu numero</p>
          <div className="grid grid-cols-5 gap-2">
            {boletos.map((b) => (
              <button
                key={b.numero}
                disabled={b.estado !== 'disponible' || config.finalizado}
                onClick={() => setSeleccionado(b.numero)}
                className={`h-11 rounded-xl font-bold text-sm transition-all active:scale-90 
                  ${b.estado === 'disponible' ? 'bg-slate-50 text-emerald-600 border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400' : ''}
                  ${b.estado === 'reservado' ? 'bg-amber-400 text-white animate-pulse' : ''}
                  ${b.estado === 'vendido' ? 'bg-slate-200 text-slate-400' : ''}
                  disabled:cursor-not-allowed
                `}
              >
                {String(b.numero).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl p-5 text-white text-center shadow-xl">
          <p className="text-emerald-100 text-xs font-bold uppercase mb-1">Precio por numero</p>
          <p className="text-3xl font-black">{config.valor_boleto || '$5000'}</p>
          <div className="mt-3 bg-white/20 rounded-xl p-3">
            <p className="text-xs opacity-80">Alias de Mercado Pago</p>
            <p className="font-mono font-bold">.: rifas.rosario</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-lg border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            Actividad en vivo
          </p>
          {comentarios.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">No hay actividad aun</p>
          ) : (
            comentarios.map((c, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-xs">
                  {c.nombre?.[0]?.toUpperCase()}
                </div>
                <p className="text-sm flex-1"><span className="font-bold text-emerald-600">{c.nombre}</span> <span className="text-slate-500">{c.mensaje}</span></p>
              </div>
            ))
          )}
        </div>

        {user && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-center">
            <p className="text-emerald-700 text-sm font-medium">Notificaciones activadas</p>
            <p className="text-emerald-500 text-xs">Recibiras alerts cuando reserven numeros</p>
          </div>
        )}
      </main>

      {seleccionado !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4" onClick={() => setSeleccionado(null)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-center mb-1">Reservar</h2>
            <p className="text-5xl font-black text-emerald-500 text-center mb-4">#{String(seleccionado).padStart(2, '0')}</p>
            <div className="bg-slate-50 p-4 rounded-2xl mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Alias de Mercado Pago</p>
              <p className="text-lg font-mono font-bold text-emerald-600">.: rifas.rosario</p>
              <p className="mt-2 text-sm text-slate-500">Valor: <span className="font-bold text-slate-900">{config.valor_boleto}</span></p>
            </div>
            <form onSubmit={handleReserva} className="space-y-3">
              <input name="nombre" placeholder="Tu nombre" required className="w-full bg-slate-100 rounded-xl p-3.5 font-medium" />
              <input name="whatsapp" placeholder="WhatsApp (Ej: 3416123456)" required className="w-full bg-slate-100 rounded-xl p-3.5 font-medium" />
              <button disabled={loading} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {loading ? 'Reservando...' : 'YA TRANSFERI'}
              </button>
            </form>
            <button onClick={() => setSeleccionado(null)} className="w-full mt-3 text-slate-400 font-medium text-sm py-2">Cerrar</button>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAuth(false)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-center mb-1">{authMode === 'login' ? 'Iniciar Sesion' : 'Crear Cuenta'}</h2>
            <p className="text-slate-400 text-sm text-center mb-4">Activa notificaciones de reservas</p>
            
            {authError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{authError}</div>
            )}
            
            <form onSubmit={handleAuth} className="space-y-3">
              {authMode === 'signup' && (
                <input type="text" placeholder="Tu nombre" required className="w-full bg-slate-100 rounded-xl p-3.5 font-medium" value={authData.nombre} onChange={e => setAuthData({...authData, nombre: e.target.value})} />
              )}
              <input type="email" placeholder="Email" required className="w-full bg-slate-100 rounded-xl p-3.5 font-medium" value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})} />
              <input type="password" placeholder="Contrasena" required className="w-full bg-slate-100 rounded-xl p-3.5 font-medium" value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} />
              <button disabled={authLoading} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {authLoading ? 'Cargando...' : authMode === 'login' ? 'INGRESAR' : 'CREAR CUENTA'}
              </button>
            </form>
            
            <div className="mt-4 text-center">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }} className="text-emerald-600 font-medium text-sm">
                {authMode === 'login' ? 'No tienes cuenta? Crea una' : 'Ya tienes cuenta? Inicia sesion'}
              </button>
            </div>
            <button onClick={() => setShowAuth(false)} className="w-full mt-3 text-slate-400 font-medium text-sm py-2">Cerrar</button>
          </div>
        </div>
      )}

      {config.finalizado && (
        <div className="fixed inset-0 bg-emerald-600 z-[60] flex flex-col items-center justify-center p-8 text-white text-center">
          <p className="text-7xl font-black mb-2">#{String(config.ganador_num || 0).padStart(2, '0')}</p>
          <p className="text-2xl font-bold mb-2">Ganador</p>
          <p className="text-xl">{config.ganador_nombre}</p>
          <button onClick={() => window.location.reload()} className="mt-8 bg-white text-emerald-600 px-8 py-3 rounded-full font-black">Cerrar</button>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import confetti from 'canvas-confetti';

export default function RifaApp() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [boletos, setBoletos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [ganadores, setGanadores] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', nombre: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === null) setDarkMode(true);
    else setDarkMode(saved === 'true');
    
    if (!supabase) return;
    fetchCategorias();
    fetchProductos();
    fetchGanadores();
    
    const sub = supabase.channel('cambios').on('postgres_changes', { event: '*', schema: 'public', table: 'boletos' }, () => {
      if (productoSeleccionado) fetchBoletos(productoSeleccionado.id);
    }).subscribe();

    const handleInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      supabase.removeChannel(sub);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferredPrompt(null);
  };

  useEffect(() => { fetchProductos(); }, [categoriaActiva]);
  useEffect(() => { if (productoSeleccionado) fetchBoletos(productoSeleccionado.id); }, [productoSeleccionado]);

  const fetchCategorias = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('categorias').select('*').order('nombre');
    setCategorias(data || []);
  };

  const fetchProductos = async () => {
    if (!supabase) return;
    let query = supabase.from('productos').select('*, categorias(nombre)');
    if (categoriaActiva) query = query.eq('categoria_id', categoriaActiva);
    query = query.eq('finalizado', false);
    const { data } = await query;
    setProductos(data || []);
  };

  const fetchBoletos = async (productoId) => {
    if (!supabase) return;
    const { data } = await supabase.from('boletos').select('*').eq('producto_id', productoId).order('numero');
    setBoletos(data || []);
  };

  const fetchGanadores = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('productos').select('*, categorias(nombre)').eq('finalizado', true).order('updated_at', { ascending: false }).limit(5);
    setGanadores(data || []);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setAuthLoading(true);
    setAuthError('');
    setAuthSuccess('');

    if (authMode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: { data: { nombre: authForm.nombre } }
      });
      if (error) setAuthError(error.message);
      else {
        setAuthSuccess('Cuenta creada! Ya podes participar de las rifas.');
        setTimeout(() => setShowAuth(false), 2000);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password
      });
      if (error) setAuthError('Email o contrasena incorrectos');
      else setShowAuth(false);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const WHATSAPP = '5493416971479';

  const handleReserva = async (e) => {
    e.preventDefault();
    if (!supabase || !seleccionado) return;
    setLoading(true);
    const nombre = e.target.nombre.value;
    const whatsapp = e.target.whatsapp.value;
    const { error } = await supabase.from('boletos').update({
      estado: 'vendido',
      nombre, whatsapp
    }).eq('numero', seleccionado).eq('producto_id', productoSeleccionado.id);

    if (!error) {
      confetti();
      const msg = `🎟️ *RESERVA - RIFAS ROSARIO*\n\n`;
      const msg2 = `✅ Numero: *#${String(seleccionado).padStart(2,'0')}*\n`;
      const msg3 = `🎁 Producto: ${productoSeleccionado.nombre}\n`;
      const msg4 = `💰 Precio: ${productoSeleccionado.precio}\n\n`;
      const msg5 = `👤 Nombre: ${nombre}\n`;
      const msg6 = `📱 WhatsApp: ${whatsapp}\n\n`;
      const msg7 = `💳 *Alias: .: rifas.rosario*\n\n`;
      const msg8 = `Enviame el comprobante de pago! 🙏`;
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg+msg2+msg3+msg4+msg5+msg6+msg7+msg8)}`);
      setTimeout(() => { setSeleccionado(null); fetchBoletos(productoSeleccionado.id); }, 2000);
    }
    setLoading(false);
  };

  const shareApp = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: 'RIFAS ROSARIO 🎉', text: 'Mira estas rifas increibles!', url });
    else { await navigator.clipboard.writeText(url); alert('Link copiado!'); }
  };

  const vendidosCount = boletos.filter(b => b.estado === 'vendido').length;
  const porcentaje = boletos.length > 0 ? Math.round((vendidosCount / boletos.length) * 100) : 0;
  const theme = darkMode;

  return (
    <div className={`min-h-screen pb-32 ${theme ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-0 left-1/4 w-96 h-96 ${theme ? 'bg-pink-500/20' : 'bg-pink-200/30'} rounded-full blur-3xl`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 ${theme ? 'bg-cyan-500/20' : 'bg-cyan-200/30'} rounded-full blur-3xl`}></div>
      </div>

      <header className={`sticky top-0 z-50 ${theme ? 'bg-black/90 backdrop-blur-xl border-b border-white/10' : 'bg-white/90 backdrop-blur-xl border-b border-gray-200'}`}>
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
<div className="flex items-center gap-2">
              <img src="/logo.png" alt="Rifas Rosario" className="h-10 w-10 object-contain rounded-lg" />
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">RIFAS ROSARIO</h1>
                <p className={`text-[10px] ${theme ? 'text-gray-500' : 'text-gray-400'}`}>La mejor rifa de Rosario</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={shareApp} className="p-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
              <button onClick={() => { setDarkMode(!darkMode); localStorage.setItem('darkMode', !darkMode); }} className={`p-2 rounded-full ${theme ? 'bg-white/10' : 'bg-black/10'}`}>
                {theme ? '🌝' : '🌚'}
              </button>
              <button onClick={() => setShowAuth(true)} className={`p-2 rounded-full ${theme ? 'bg-white/10' : 'bg-black/10'}`}>
                {showAuth ? '✕' : '👤'}
              </button>
              <button onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded-full ${theme ? 'bg-white/10' : 'bg-black/10'}`}>
                {showMenu ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {showMenu && (
        <div className={`fixed inset-0 z-40 ${theme ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-xl p-6`}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black">Menu</h2>
            <button onClick={() => setShowMenu(false)} className="text-3xl">✕</button>
          </div>
          <nav className="space-y-4">
            <button onClick={() => { setShowAuth(true); setShowMenu(false); }} className="w-full block p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg text-center shadow-lg">✨ Mi Cuenta</button>
            <a href="/admin" className="block p-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black text-lg text-center shadow-lg">🔐 Panel Admin</a>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" className="block p-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-lg text-center shadow-lg">📱 WhatsApp</a>
            <button onClick={() => { shareApp(); setShowMenu(false); }} className="w-full p-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-lg shadow-lg">📤 Compartir App</button>
            {showInstall && <button onClick={() => { installApp(); setShowMenu(false); }} className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-lg shadow-lg">📲 Instalar App</button>}
          </nav>
        </div>
      )}

      {!productoSeleccionado ? (
        <main className="max-w-lg mx-auto p-4 space-y-6 relative z-10">
          {ganadores.length > 0 && (
            <div className={`rounded-3xl p-4 ${theme ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-300'}`}>
              <h2 className="font-black text-lg mb-3 flex items-center gap-2">
                <span className="animate-bounce inline-block">🏆</span> GANADORES
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {ganadores.map(g => (
                  <div key={g.id} className={`flex-shrink-0 p-3 rounded-2xl ${theme ? 'bg-black/50' : 'bg-white'}`}>
                    <p className="font-black text-pink-500">#{String(g.ganador_num).padStart(2,'0')}</p>
                    <p className={`text-xs ${theme ? 'text-gray-400' : 'text-gray-500'}`}>{g.ganador_nombre}</p>
                    <p className={`text-[10px] ${theme ? 'text-gray-500' : 'text-gray-400'}`}>{g.nombre}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={`flex gap-2 overflow-x-auto pb-4 ${theme ? 'bg-white/5' : 'bg-black/5'} rounded-2xl p-2`}>
            <button onClick={() => setCategoriaActiva(null)} className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all ${!categoriaActiva ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30' : theme ? 'bg-white/10 text-white' : 'bg-black/10'}`}>
              Todos 🔥
            </button>
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)} className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all ${categoriaActiva === cat.id ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30' : theme ? 'bg-white/10 text-white' : 'bg-black/10'}`}>
                {cat.nombre}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {productos.map(prod => (
              <div
                key={prod.id}
                onClick={() => setProductoSeleccionado(prod)}
                className={`cursor-pointer rounded-3xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98] ${theme ? 'bg-white/5 border border-white/10' : 'bg-white shadow-xl'}`}
              >
                <div className={`aspect-square relative ${theme ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20' : 'bg-gradient-to-br from-pink-100 to-purple-100'} flex items-center justify-center`}>
                  {prod.imagen ? (
                    <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-8xl">🎁</span>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                      {prod.categorias?.nombre}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="bg-black/80 text-white text-xs font-bold px-2 py-1 rounded-full">{prod.precio}</span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-black text-lg">{prod.nombre}</h3>
                  <p className={`text-sm ${theme ? 'text-gray-400' : 'text-gray-500'}`}>100 numeros disponibles</p>
                  <button className="w-full mt-3 bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-pink-500/30 active:scale-95 transition-transform">
                    VER NUMEROS →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {productos.length === 0 && (
            <div className={`text-center py-16 rounded-3xl ${theme ? 'bg-white/5' : 'bg-gray-50'}`}>
              <span className="text-8xl mb-6 block animate-pulse">🎰</span>
              <p className="text-2xl font-black">Proximamente</p>
              <p className={`mt-2 ${theme ? 'text-gray-500' : 'text-gray-400'}`}>Nuevas rifas muy pronto!</p>
            </div>
          )}

          {showInstall && (
            <button onClick={installApp} className="fixed bottom-24 left-4 right-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-pink-500/40 animate-bounce z-50">
              📲 INSTALAR APP EN TU CELULAR
            </button>
          )}

<a href={`https://wa.me/${WHATSAPP}?text=Hola! Quiero saber mas sobre las rifas`} className="block w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black py-4 rounded-3xl text-center shadow-xl shadow-green-500/40">
            💬 ESCRIBINOS POR WHATSAPP
          </a>

          <button onClick={() => setShowAuth(true)} className="block w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black py-4 rounded-3xl text-center shadow-xl shadow-purple-500/40">
            ✨ CREAR MI CUENTA
          </button>
        </main>
      )}
            </div>
            <div className="p-5">
              <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-black px-3 py-1.5 rounded-full">{productoSeleccionado.categorias?.nombre}</span>
              <h2 className="font-black text-2xl mt-3">{productoSeleccionado.nombre}</h2>
              <p className="text-4xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent mt-1">{productoSeleccionado.precio}</p>
              
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className={`text-sm ${theme ? 'text-gray-400' : 'text-gray-500'}`}>Vendidos</p>
                  <p className="text-2xl font-black">{vendidosCount}/100</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm ${theme ? 'text-gray-400' : 'text-gray-500'}`}>Progreso</p>
                  <p className="text-2xl font-black">{porcentaje}%</p>
                </div>
              </div>
              <div className={`h-4 rounded-full mt-2 overflow-hidden ${theme ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${porcentaje}%` }}></div>
              </div>
            </div>
          </div>

          <div className={`rounded-3xl p-4 ${theme ? 'bg-white/5 border border-white/10' : 'bg-white shadow-xl'}`}>
            <p className="text-center font-black text-lg mb-4 flex items-center justify-center gap-2">
              <span>🎰</span> ELEGÍ TU NUMERO <span>🎰</span>
            </p>
            <div className="grid grid-cols-10 gap-2">
              {boletos.map(b => (
                <button
                  key={b.id}
                  disabled={b.estado === 'vendido'}
                  onClick={() => setSeleccionado(b.numero)}
                  className={`h-12 rounded-xl font-black text-sm transition-all active:scale-90
                    ${b.estado === 'vendido' 
                      ? 'bg-gradient-to-b from-gray-800 to-black text-white shadow-inner cursor-not-allowed' 
                      : 'bg-gradient-to-b from-pink-400 to-pink-600 text-white shadow-lg shadow-pink-500/50 hover:shadow-pink-500/80 hover:scale-110'
                    }`}
                >
                  {String(b.numero).padStart(2, '0')}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm font-bold">
              <span><span className="w-4 h-4 inline-block bg-gradient-to-b from-pink-400 to-pink-600 rounded shadow-md mr-1"></span>Libre</span>
              <span><span className="w-4 h-4 inline-block bg-gradient-to-b from-gray-800 to-black rounded shadow-inner mr-1"></span>Ocupado</span>
            </div>
          </div>

          <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola! Estoy interesado en la rifa: ${productoSeleccionado.nombre}`)}`} className="block w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-black py-4 rounded-3xl text-center shadow-xl shadow-green-500/40 animate-bounce">
            📱 CONTACTAR AL WHATSAPP
          </a>

          <div className={`rounded-3xl p-4 text-center ${theme ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-100 to-purple-100'}`}>
            <p className="text-sm font-bold mb-1">💳 PAGÁ CON MERCADO PAGO</p>
            <p className="text-2xl font-black text-pink-500">.: rifas.rosario</p>
          </div>
        </main>
      )}

      {seleccionado !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setSeleccionado(null)}>
          <div className={`absolute inset-0 ${theme ? 'bg-black/80' : 'bg-black/60'} backdrop-blur-sm`}></div>
          <div className={`relative w-full max-w-md rounded-t-[2.5rem] p-6 ${theme ? 'bg-gray-900' : 'bg-white'} shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="w-16 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            
            <div className="text-center mb-4">
              <p className="text-sm font-bold text-gray-400">NUMERO ELEGIDO</p>
              <p className="text-7xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">#{String(seleccionado).padStart(2,'0')}</p>
            </div>

            <div className={`p-4 rounded-2xl mb-4 ${theme ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20' : 'bg-gradient-to-r from-pink-50 to-purple-50'}`}>
              <p className="font-black text-lg">{productoSeleccionado?.nombre}</p>
              <p className="text-2xl font-black text-pink-500">{productoSeleccionado?.precio}</p>
            </div>

            <form onSubmit={handleReserva} className="space-y-3">
              <input name="nombre" placeholder="Tu nombre completo" required className={`w-full rounded-2xl p-4 font-bold ${theme ? 'bg-white/10 border border-white/20' : 'bg-gray-100'}`} />
              <input name="whatsapp" placeholder="Tu WhatsApp" required className={`w-full rounded-2xl p-4 font-bold ${theme ? 'bg-white/10 border border-white/20' : 'bg-gray-100'}`} />
              <button disabled={loading} className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-pink-500/40 active:scale-95 transition-transform disabled:opacity-50">
                {loading ? '⏳ Enviando...' : '📤 ENVIAR POR WHATSAPP'}
              </button>
            </form>
            <button onClick={() => setSeleccionado(null)} className="w-full mt-3 py-3 font-bold text-gray-400">Cancelar</button>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 ${theme ? 'bg-black/90' : 'bg-black/60'} backdrop-blur-sm`} onClick={() => setShowAuth(false)}></div>
          <div className={`relative w-full max-w-sm rounded-3xl p-6 ${theme ? 'bg-gray-900 border border-white/10' : 'bg-white'} shadow-2xl`}>
            <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-2xl">✕</button>
            
            <div className="text-center mb-6">
              <span className="text-5xl mb-3 block">{authMode === 'login' ? '👤' : '✨'}</span>
              <h2 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">
                {authMode === 'login' ? 'INGRESAR' : 'CREAR CUENTA'}
              </h2>
              <p className={`text-sm ${theme ? 'text-gray-400' : 'text-gray-500'}`}>
                {authMode === 'login' ? 'Inicia sesion para participar' : 'Registrate para participar de las rifas'}
              </p>
            </div>

            {authError && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-xl text-sm mb-4 text-center">{authError}</div>
            )}
            {authSuccess && (
              <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 p-3 rounded-xl text-sm mb-4 text-center">{authSuccess}</div>
            )}

            <form onSubmit={handleAuth} className="space-y-3">
              {authMode === 'signup' && (
                <input type="text" placeholder="Tu nombre" required value={authForm.nombre} onChange={e => setAuthForm({...authForm, nombre: e.target.value})} className={`w-full rounded-xl p-3.5 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
              )}
              <input type="email" placeholder="Email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className={`w-full rounded-xl p-3.5 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
              <input type="password" placeholder="Contrasena" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className={`w-full rounded-xl p-3.5 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
              <button disabled={authLoading} className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-black py-4 rounded-xl shadow-lg">
                {authLoading ? '⏳' : authMode === 'login' ? 'INGRESAR →' : 'CREAR CUENTA ✨'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthSuccess(''); }} className="text-sm font-bold text-pink-500">
                {authMode === 'login' ? 'No tienes cuenta? Crea una' : 'Ya tienes cuenta? Inicia sesion'}
              </button>
            </div>

            <div className="mt-4 text-center">
              <a href="/admin" className="text-xs font-bold text-gray-500 hover:text-pink-500">Panel Admin 🔐</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
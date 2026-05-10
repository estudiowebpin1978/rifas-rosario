'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';

export default function RifaApp() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', nombre: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [user, setUser] = useState(null);

  const LOGO_URL = 'https://tmpfiles.org/dl/37442389/logo.png';
  const WHATSAPP = '5493416971479';

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === null) setDarkMode(true);
    else setDarkMode(saved === 'true');
    
    if (!supabase) return;
    
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
        setAuthSuccess('Cuenta creada! Ahora podes participar.');
        setTimeout(() => setShowAuth(false), 2000);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: authForm.email,
        password: authForm.password
      });
      if (error) setAuthError('Email o contrasena incorrectos');
      else {
        setShowAuth(false);
        router.push('/app');
      }
    }
    setAuthLoading(false);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', !darkMode);
  };

  const theme = darkMode;

  return (
    <div className={`min-h-screen ${theme ? 'bg-black text-white' : 'bg-white'}`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      <header className={`sticky top-0 z-50 ${theme ? 'bg-black/90 backdrop-blur-xl border-b border-white/10' : 'bg-white/90 backdrop-blur-xl border-b'}`}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Rifas Rosario" className="h-12 w-12 object-contain rounded-xl" />
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">RIFAS ROSARIO</h1>
              <p className="text-[10px] text-gray-500">Sin tarjeta · 100% gratis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDarkMode} className={`p-2 rounded-full ${theme ? 'bg-white/10' : 'bg-black/10'}`}>
              {theme ? '🌝' : '🌚'}
            </button>
            <button onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded-full ${theme ? 'bg-white/10' : 'bg-black/10'}`}>
              {showMenu ? '✕' : '☰'}
            </button>
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
            <button onClick={() => { setShowAuth(true); setAuthMode('login'); setShowMenu(false); }} className="w-full block p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg text-center shadow-lg">👤 Mi Cuenta</button>
            <a href="/admin" className="block p-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black text-lg text-center shadow-lg">🔐 Panel Admin</a>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" className="block p-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-lg text-center shadow-lg">📱 WhatsApp</a>
          </nav>
        </div>
      )}

      <main className="max-w-lg mx-auto p-6 relative z-10">
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-4 rounded-3xl overflow-hidden shadow-2xl shadow-pink-500/30">
            <img src={LOGO_URL} alt="Rifas Rosario" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-3xl font-black mb-2">RIFAS ROSARIO</h2>
          <p className="text-xl font-bold text-pink-500">100% GRATIS · SIN TARJETA</p>
        </div>

        <div className="space-y-4">
          <button onClick={() => { setShowAuth(true); setAuthMode('login'); }} className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-black py-5 rounded-3xl text-xl shadow-xl shadow-pink-500/40 animate-bounce">
            🚀 Entrar a Rifas Rosario
          </button>
          
<button onClick={() => { setShowAuth(true); setAuthMode('signup'); }} className={`w-full font-black py-4 rounded-3xl text-lg hover:opacity-90 transition-all ${theme ? 'bg-white/10 border-2 border-white/20 text-white' : 'bg-pink-500 text-white shadow-lg'}`}>
                ✨ Crear cuenta gratis
              </button>
        </div>

        <div className="mt-8 text-center">
          <a href="/app" className="text-pink-500 font-bold text-lg hover:underline">
            Ver rifas disponibles sin cuenta →
          </a>
        </div>
      </main>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`absolute inset-0 ${theme ? 'bg-black/90' : 'bg-black/60'} backdrop-blur-sm`} onClick={() => setShowAuth(false)}></div>
          <div className={`relative w-full max-w-sm rounded-3xl p-6 ${theme ? 'bg-gray-900 border border-white/10' : 'bg-white'} shadow-2xl`}>
            <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-2xl">✕</button>
            
            <div className="text-center mb-6">
              <img src={LOGO_URL} alt="logo" className="w-16 h-16 mx-auto mb-3 rounded-xl object-cover" />
              <h2 className="text-2xl font-black">{authMode === 'login' ? 'ENTRAR' : 'CREAR CUENTA'}</h2>
            </div>

            {authError && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-xl text-sm mb-4 text-center">{authError}</div>}
            {authSuccess && <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-400 p-3 rounded-xl text-sm mb-4 text-center">{authSuccess}</div>}

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <input type="text" placeholder="Tu nombre" required value={authForm.nombre} onChange={e => setAuthForm({...authForm, nombre: e.target.value})} className={`w-full rounded-xl p-4 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
              )}
              <input type="email" placeholder="Email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className={`w-full rounded-xl p-4 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
              <input type="password" placeholder="Contrasena" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className={`w-full rounded-xl p-4 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
              <button disabled={authLoading} className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-black py-4 rounded-xl shadow-lg">
                {authLoading ? '⏳' : authMode === 'login' ? '🚀 ENTRAR' : '✨ CREAR CUENTA'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthSuccess(''); }} className="text-sm font-bold text-pink-500">
                {authMode === 'login' ? 'No tienes cuenta? Crea una' : 'Ya tienes cuenta? Inicia sesion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
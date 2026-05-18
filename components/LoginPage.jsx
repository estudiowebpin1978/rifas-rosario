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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  const WHATSAPP = '5493412500029';

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

    const handleInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => { subscription.unsubscribe(); window.removeEventListener('beforeinstallprompt', handleInstallPrompt); };
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

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#333]">

      <header className="sticky top-0 z-50 bg-[#111827] border-b border-gray-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Eco Rifas" className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-black text-[#FE2C55]">ECO RIFAS</h1>
              <p className="text-[10px] text-gray-400 font-medium">los productos que amas, ahora los podes ganar en rifas economicas!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg bg-white/10 text-white shadow-sm hover:bg-white/20 transition-colors">
              {showMenu ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {showMenu && (
        <div className="fixed inset-0 z-40 bg-[#111827]/95 backdrop-blur-xl p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-[#FE2C55]">Menu</h2>
            <button onClick={() => setShowMenu(false)} className="text-3xl text-white">✕</button>
          </div>
          <nav className="space-y-4">
            <button onClick={() => { setShowAuth(true); setAuthMode('login'); setShowMenu(false); }} className="w-full btn-3d-pink">👤 Mi Cuenta</button>
            <a href="/admin" className="block p-4 rounded-lg bg-[#111111] text-white font-bold text-lg text-center shadow-sm hover:bg-[#222222] transition-colors">🔐 Panel Admin</a>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" className="block p-4 rounded-lg bg-[#39B54A] text-white font-bold text-lg text-center shadow-sm hover:bg-[#2d9e3d] transition-colors">📱 WhatsApp</a>
            {showInstall && <button onClick={async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') setShowInstall(false); setDeferredPrompt(null); setShowMenu(false); }} className="w-full block p-4 rounded-lg bg-gray-800 text-white font-bold text-lg text-center shadow-sm hover:bg-gray-700 transition-colors">📲 Instalar App</button>}
            <a href="/terminos" className="block p-4 rounded-lg bg-white/10 text-gray-300 font-bold text-lg text-center border border-gray-700 shadow-sm hover:bg-white/20 transition-colors">📜 Terminos y Condiciones</a>
          </nav>
        </div>
      )}

      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FE2C55]/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#25F4EE]/20 rounded-full blur-3xl"></div>
      </div>
      <main className="max-w-lg mx-auto p-6 relative z-10">
        <div className="text-center mb-8">
          <div className="w-36 h-36 mx-auto mb-6 rounded-3xl shadow-2xl bg-gradient-to-br from-[#111827] to-black border-2 border-[#FE2C55]/30 flex items-center justify-center">
            <img src="/logo.svg" alt="Eco Rifas" className="w-28 h-28" />
          </div>
          <h2 className="text-4xl font-black mb-2 text-[#111827]">ECO RIFAS</h2>
          <p className="text-lg font-medium text-[#666]">🛒 Los productos que amas · ahora en rifas economicas!</p>
        </div>

        <div className="space-y-4">
          <button onClick={() => { setShowAuth(true); setAuthMode('login'); }} className="w-full btn-3d-pink text-lg">
            🚀 Entrar a Eco Rifas
          </button>
          
          <button onClick={() => { setShowAuth(true); setAuthMode('signup'); }} className="w-full font-bold py-4 rounded-2xl text-lg bg-white border-2 border-[#FE2C55] text-[#333] shadow-md hover:bg-[#FE2C55]/10 hover:shadow-lg transition-all active:scale-[0.98]">
            ✨ Crear cuenta gratis
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <span className="trust-badge">🔒 Pago Seguro</span>
          <span className="trust-badge">🀄 Sorteo Transparente</span>
          <span className="trust-badge">✅ 100% Confiable</span>
        </div>

        <div className="mt-8 text-center">
          <a href="/app" className="text-[#FE2C55] font-bold text-lg hover:underline">
            Ver rifas disponibles sin cuenta →
          </a>
        </div>
      </main>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAuth(false)}></div>
          <div className="relative w-full max-w-sm rounded-2xl p-6 bg-white border border-[#EBEBEB] shadow-2xl">
            <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-2xl text-[#333]">✕</button>
            
            <div className="text-center mb-6">
              <img src="/logo.svg" alt="Eco Rifas" className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-2xl font-black text-[#111827]">{authMode === 'login' ? 'ENTRAR' : 'CREAR CUENTA'}</h2>
            </div>

            {authError && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">{authError}</div>}
            {authSuccess && <div className="bg-green-50 border border-green-200 text-[#39B54A] p-3 rounded-lg text-sm mb-4 text-center">{authSuccess}</div>}

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <input type="text" placeholder="Tu nombre" required value={authForm.nombre} onChange={e => setAuthForm({...authForm, nombre: e.target.value})} className="w-full rounded-xl p-4 font-bold bg-white border border-[#EBEBEB] focus:border-[#FE2C55] outline-none text-[#333]" />
              )}
              <input type="email" placeholder="Email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full rounded-xl p-4 font-bold bg-white border border-[#EBEBEB] focus:border-[#FE2C55] outline-none text-[#333]" />
              <input type="password" placeholder="Contrasena" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full rounded-xl p-4 font-bold bg-white border border-[#EBEBEB] focus:border-[#FE2C55] outline-none text-[#333]" />
              <button disabled={authLoading} className="w-full btn-3d-pink disabled:opacity-60">
                {authLoading ? '⏳' : authMode === 'login' ? '🚀 ENTRAR' : '✨ CREAR CUENTA'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthSuccess(''); }} className="text-sm font-bold text-[#FE2C55]">
                {authMode === 'login' ? 'No tienes cuenta? Crea una' : 'Ya tienes cuenta? Inicia sesion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

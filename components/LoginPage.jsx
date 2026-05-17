'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import LogoImg from '../public/logo.png';
import { supabase } from '@/lib/supabaseClient';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';

export default function RifaApp() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const theme = true;
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', nombre: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  const LOGO_URL = '/logo.png';
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

      <header className="sticky top-0 z-50 bg-[#FFE600] border-b border-yellow-300">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1A3C6D] rounded-lg flex items-center justify-center text-white font-black text-lg">MR</div>
            <div>
              <h1 className="text-xl font-black text-[#1A3C6D]">MERCADO RIFAS</h1>
              <p className="text-[10px] text-[#666] font-medium">los productos que amas, ahora los podes ganar en rifas economicas!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg bg-white/80 text-[#333] shadow-sm hover:bg-white transition-colors">
              {showMenu ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </header>

      {showMenu && (
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-[#1A3C6D]">Menu</h2>
            <button onClick={() => setShowMenu(false)} className="text-3xl">✕</button>
          </div>
          <nav className="space-y-4">
            <button onClick={() => { setShowAuth(true); setAuthMode('login'); setShowMenu(false); }} className="w-full block p-4 rounded-lg bg-[#3483FA] text-white font-bold text-lg text-center shadow-sm hover:bg-[#2d6fd4] transition-colors">👤 Mi Cuenta</button>
            <a href="/admin" className="block p-4 rounded-lg bg-[#1A3C6D] text-white font-bold text-lg text-center shadow-sm hover:bg-[#152f55] transition-colors">🔐 Panel Admin</a>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" className="block p-4 rounded-lg bg-[#39B54A] text-white font-bold text-lg text-center shadow-sm hover:bg-[#2d9e3d] transition-colors">📱 WhatsApp</a>
            {showInstall && <button onClick={async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') setShowInstall(false); setDeferredPrompt(null); setShowMenu(false); }} className="w-full block p-4 rounded-lg bg-[#FFE600] text-[#333] font-bold text-lg text-center shadow-sm hover:bg-[#f0d800] transition-colors">📲 Instalar App</button>}
            <a href="/terminos" className="block p-4 rounded-lg bg-white text-[#666] font-bold text-lg text-center border border-[#EBEBEB] shadow-sm hover:bg-[#F5F5F5] transition-colors">📜 Terminos y Condiciones</a>
          </nav>
        </div>
      )}

      <main className="max-w-lg mx-auto p-6 relative z-10">
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-4 rounded-lg overflow-hidden shadow-sm bg-white border border-[#EBEBEB] flex items-center justify-center">
            <div className="w-24 h-24 bg-[#1A3C6D] rounded-lg flex items-center justify-center text-white font-black text-3xl">MR</div>
          </div>
          <h2 className="text-3xl font-black mb-2 text-[#1A3C6D]">MERCADO RIFAS</h2>
          <p className="text-lg font-medium text-[#666]">🛒 Los productos que amas · ahora en rifas economicas!</p>
        </div>

        <div className="space-y-4">
          <button onClick={() => { setShowAuth(true); setAuthMode('login'); }} className="w-full btn-3d-blue text-xl">
            🚀 Entrar a Mercado Rifas
          </button>
          
          <button onClick={() => { setShowAuth(true); setAuthMode('signup'); }} className="w-full font-bold py-4 rounded-2xl text-lg bg-white border-2 border-[#FFE600] text-[#333] shadow-md hover:bg-[#FFE600]/10 hover:shadow-lg transition-all active:scale-[0.98]">
            ✨ Crear cuenta gratis
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <span className="trust-badge">🔒 Pago Seguro</span>
          <span className="trust-badge">🀄 Sorteo Transparente</span>
          <span className="trust-badge">✅ 100% Confiable</span>
        </div>

        <div className="mt-8 text-center">
          <a href="/app" className="text-[#3483FA] font-bold text-lg hover:underline">
            Ver rifas disponibles sin cuenta →
          </a>
        </div>
      </main>

      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAuth(false)}></div>
          <div className="relative w-full max-w-sm rounded-lg p-6 bg-white border border-[#EBEBEB] shadow-lg">
            <button onClick={() => setShowAuth(false)} className="absolute top-4 right-4 text-2xl text-[#333]">✕</button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#1A3C6D] rounded-lg flex items-center justify-center text-white font-black text-xl mx-auto mb-3">MR</div>
              <h2 className="text-2xl font-black text-[#1A3C6D]">{authMode === 'login' ? 'ENTRAR' : 'CREAR CUENTA'}</h2>
            </div>

            {authError && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4 text-center">{authError}</div>}
            {authSuccess && <div className="bg-green-50 border border-green-200 text-[#39B54A] p-3 rounded-lg text-sm mb-4 text-center">{authSuccess}</div>}

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <input type="text" placeholder="Tu nombre" required value={authForm.nombre} onChange={e => setAuthForm({...authForm, nombre: e.target.value})} className="w-full rounded-lg p-4 font-bold bg-white border border-[#EBEBEB] focus:border-[#3483FA] outline-none text-[#333]" />
              )}
              <input type="email" placeholder="Email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full rounded-lg p-4 font-bold bg-white border border-[#EBEBEB] focus:border-[#3483FA] outline-none text-[#333]" />
              <input type="password" placeholder="Contrasena" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full rounded-lg p-4 font-bold bg-white border border-[#EBEBEB] focus:border-[#3483FA] outline-none text-[#333]" />
              <button disabled={authLoading} className="w-full btn-3d-blue disabled:opacity-60">
                {authLoading ? '⏳' : authMode === 'login' ? '🚀 ENTRAR' : '✨ CREAR CUENTA'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthSuccess(''); }} className="text-sm font-bold text-[#3483FA]">
                {authMode === 'login' ? 'No tienes cuenta? Crea una' : 'Ya tienes cuenta? Inicia sesion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
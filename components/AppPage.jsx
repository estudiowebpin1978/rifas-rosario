'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';

export default function AppPage() {
  const router = useRouter();
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
  const [showReserva, setShowReserva] = useState(false);
  const [reservaForm, setReservaForm] = useState({ nombre: '', whatsapp: '' });
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSorteo, setShowSorteo] = useState(false);
  const [sorteoCountdown, setSorteoCountdown] = useState(30);
  const [ganadorAnimado, setGanadorAnimado] = useState(null);
  const [showPremio, setShowPremio] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });
  }, []);

  const LOGO_URL = '/logo.png';
  const WHATSAPP = '5493416971479';
  const URL_APP = 'https://rifas-rosario.vercel.app/app';
  const ALIAS = 'rifas.rosario.';

  const copyAlias = () => {
    navigator.clipboard.writeText(ALIAS);
    alert('Alias copiado!');
  };

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === null) setDarkMode(true);
    else setDarkMode(saved === 'true');
    
    fetchCategorias();
    fetchProductos();
    fetchGanadores();
    
    if (supabase) {
      try {
        const sub = supabase.channel('cambios').on('postgres_changes', { event: '*', schema: 'public', table: 'boletos' }, () => {
          if (productoSeleccionado) fetchBoletos(productoSeleccionado.id);
          fetchProductos();
          fetchGanadores();
        }).subscribe();
        return () => supabase.removeChannel(sub);
      } catch (e) {
        console.log('Realtime no disponible');
      }
    }
  }, []);

  useEffect(() => { fetchProductos(); }, [categoriaActiva]);
  useEffect(() => { if (productoSeleccionado) fetchBoletos(productoSeleccionado.id); }, [productoSeleccionado]);

  useEffect(() => {
    if (vendidosCount === 100 && !showSorteo && !productoSeleccionado?.finalizado) {
      iniciarSorteo();
    }
  }, [productos]);

  const fetchCategorias = async () => {
    try {
      const res = await fetch('/api/productos');
      const result = await res.json();
      console.log('API response:', result);
      console.log('Categorias:', result.categorias);
      setCategorias(result.categorias || []);
    } catch (err) {
      console.error('Error fetching categorias:', err);
    }
  };

  const fetchProductos = async () => {
    try {
      const res = await fetch('/api/productos');
      const result = await res.json();
      console.log('Productos:', result.productos?.length);
      if (result.productos) {
        if (categoriaActiva) {
          setProductos(result.productos.filter(p => p.categoria_id === categoriaActiva));
        } else {
          setProductos(result.productos.filter(p => !p.finalizado));
        }
      }
    } catch (err) {
      console.error('Error fetching productos:', err);
      setProductos([]);
    }
  };

  const fetchBoletos = async (productoId) => {
    try {
      const res = await fetch('/api/productos');
      const result = await res.json();
      if (result.boletos) {
        const misBoletos = result.boletos.filter(b => b.producto_id === productoId);
        setBoletos(misBoletos);
      }
    } catch (err) {
      console.error('Error fetching boletos:', err);
    }
  };

  const fetchGanadores = async () => {
    try {
      const res = await fetch('/api/productos');
      const result = await res.json();
      if (result.productos) {
        setGanadores(result.productos.filter(p => p.finalizado).slice(0, 5));
      }
    } catch (err) {
      console.error('Error fetching ganadores:', err);
    }
  };

  const iniciarSorteo = async () => {
    setShowSorteo(true);
    setSorteoCountdown(30);
    
    const intervalo = setInterval(() => {
      setSorteoCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalo);
          seleccionarGanador();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const seleccionarGanador = async () => {
    const vendidos = boletos.filter(b => b.estado === 'vendido');
    if (vendidos.length === 0) return;
    
    const winner = vendidos[Math.floor(Math.random() * vendidos.length)];
    setGanadorAnimado(winner.numero);
    
    confetti({ particleCount: 200, spread: 360, origin: { y: 0.6 } });
    
    await supabase.from('productos').update({
      finalizado: true,
      ganador_num: winner.numero,
      ganador_nombre: winner.nombre
    }).eq('id', productoSeleccionado.id);

    const msg = `🎉 *SORTEO TERMINADO - RIFAS ROSARIO*\n\n🏆 *GANADOR: #${String(winner.numero).padStart(2,'0')}*\n👤 ${winner.nombre}\n🎁 ${productoSeleccionado.nombre}\n\nTodos los participantes fueron notificados!`;
    
    for (const boleto of vendidos) {
      if (boleto.whatsapp) {
        const mensaje = boleto.numero === winner.numero 
          ? `🎉🎉🎉 *FELICIDADES!* 🎉🎉🎉\n\nGanaste el SORTEO!\n\n🎁 Producto: ${productoSeleccionado.nombre}\n🏆 Tu numero: #${String(winner.numero).padStart(2,'0')}\n\nContacta al admin para reclamar tu premio!`
          : `😢 *NO FUiste el ganador esta vez*\n\nTu numero: #${String(boleto.numero).padStart(2,'0')}\n🏆 Ganador: #${String(winner.numero).padStart(2,'0')}\n\nNo te pierdas las proximas rifas! https://rifas-rosario.vercel.app/app`;
        
        setTimeout(() => {
          window.open(`https://wa.me/${boleto.whatsapp}?text=${encodeURIComponent(mensaje)}`, '_blank');
        }, 1000);
      }
    }

    setTimeout(() => setShowPremio(true), 2000);
  };

  const contactarGanador = () => {
    const winner = boletos.find(b => b.numero === winner?.numero);
    const msg = `🎊 *FELICIDADES!* Ganaste ${productoSeleccionado.nombre}!\n\nQuiero coordinar la entrega de mi premio. Mi direccion es...`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`);
  };

  const verOtrosProductos = () => {
    setShowPremio(false);
    setShowSorteo(false);
    setProductoSeleccionado(null);
    setGanadorAnimado(null);
  };

  const handleSeleccionarNumero = (numero) => {
    setSeleccionado(numero);
    setShowReserva(true);
    setReservaForm({ nombre: '', whatsapp: '' });
  };

  const handleReserva = async (e) => {
    e.preventDefault();
    if (!supabase || !seleccionado) return;
    setLoading(true);
    
    const { error } = await supabase.from('boletos').update({
      estado: 'vendido',
      nombre: reservaForm.nombre,
      whatsapp: reservaForm.whatsapp
    }).eq('numero', seleccionado).eq('producto_id', productoSeleccionado.id);

    if (!error) {
      confetti();
      const msg = `🎟️ *RESERVA - RIFAS ROSARIO*\n\n`;
      const msg2 = `✅ Numero: *#${String(seleccionado).padStart(2,'0')}*\n`;
      const msg3 = `🎁 Producto: ${productoSeleccionado.nombre}\n`;
      const msg4 = `💰 Precio: ${productoSeleccionado.precio}\n\n`;
      const msg5 = `👤 Nombre: ${reservaForm.nombre}\n`;
      const msg6 = `📱 WhatsApp: ${reservaForm.whatsapp}\n\n`;
      const msg7 = `💳 *Alias: .: ${ALIAS}*\n\n`;
      const msg8 = `Enviame el comprobante de pago! 🙏`;
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg+msg2+msg3+msg4+msg5+msg6+msg7+msg8)}`);
      setTimeout(() => {
        setShowReserva(false);
        setSeleccionado(null);
        fetchBoletos(productoSeleccionado.id);
      }, 2000);
    }
    setLoading(false);
  };

  const installApp = async () => {
    if (!deferredPrompt) return;
    setDeferredPrompt(null);
    setShowInstallBtn(false);
    await deferredPrompt.prompt();
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', !darkMode);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent('Mira estas rifas increibles! 🎉 ' + URL_APP)}`);
  };

  const shareX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('Mira estas rifas increibles! 🎉 ' + URL_APP)}`);
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL_APP)}`);
  };

  const shareInstagram = () => {
    window.open(`https://instagram.com`);
  };

  const shareTikTok = () => {
    window.open(`https://www.tiktok.com`);
  };

  const shareGmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent('Mira estas rifas increibles! 🎉')}&body=${encodeURIComponent('Echa un vistazo a esta app de rifas: ' + URL_APP)}`);
  };

  const vendidosCount = productoSeleccionado 
    ? boletos.filter(b => b.estado === 'vendido').length 
    : 0;
  const porcentaje = boletos.length > 0 ? Math.round((vendidosCount / boletos.length) * 100) : 0;
  const theme = darkMode;

  return (
    <div className={`min-h-screen pb-24 ${theme ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
      {showSorteo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl">
          <div className="text-center">
            {!showPremio ? (
              <>
                <p className="text-xl font-bold text-pink-500 mb-4">SORTEO EN PROGRESO</p>
                <div className="text-9xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent animate-pulse">
                  {sorteoCountdown}
                </div>
                <p className="mt-6 text-gray-400">Esperando al ganador...</p>
                <div className="mt-8 flex justify-center gap-2 flex-wrap max-w-xs mx-auto">
                  {boletos.filter(b => b.estado === 'vendido').slice(0, 20).map(b => (
                    <span key={b.id} className={`px-2 py-1 rounded-lg text-sm font-bold ${ganadorAnimado === b.numero ? 'bg-yellow-500 text-black animate-bounce' : 'bg-white/10'}`}>
                      #{String(b.numero).padStart(2,'0')}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="animate-bounce mb-6">
                  <span className="text-8xl">🎊</span>
                </div>
                <p className="text-2xl font-black text-yellow-500 mb-2">GANADOR!</p>
                <p className="text-8xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent animate-pulse">
                  #{String(ganadorAnimado).padStart(2,'0')}
                </p>
                <p className="mt-4 text-xl font-bold">{boletos.find(b => b.numero === ganadorAnimado)?.nombre}</p>
                <p className="mt-2 text-pink-500 font-bold">{productoSeleccionado?.nombre}</p>
                <div className="mt-8 space-y-3">
                  <button onClick={contactarGanador} className="w-full bg-green-500 text-white font-black py-4 rounded-2xl text-lg">
                    📱 Contactar para reclamar premio
                  </button>
                  <button onClick={verOtrosProductos} className="w-full bg-pink-500 text-white font-black py-4 rounded-2xl text-lg">
                    🎰 Ver otras rifas
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      <header className={`sticky top-0 z-50 ${theme ? 'bg-black/90 backdrop-blur-xl border-b border-white/10' : 'bg-white/90 backdrop-blur-xl border-b'}`}>
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="Rifas Rosario" className="h-10 w-10 object-contain rounded-lg" />
              <div>
                <h1 className="text-xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">RIFAS ROSARIO</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/')} className={`p-2 rounded-full ${theme ? 'bg-white/10' : 'bg-black/10'}`}>🏠</button>
              {showInstallBtn && <button onClick={installApp} className={`p-2 rounded-full bg-green-500/20`}>📲</button>}
              <button onClick={() => setShowShare(true)} className={`p-2 rounded-full ${theme ? 'bg-white/10' : 'bg-black/10'}`}>📤</button>
              <button onClick={toggleDarkMode} className={`p-2 rounded-full ${theme ? 'bg-white/10' : 'bg-black/10'}`}>{theme ? '🌝' : '🌚'}</button>
              <button onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded-full ${theme ? 'bg-white/10' : 'bg-black/10'}`}>{showMenu ? '✕' : '☰'}</button>
            </div>
          </div>
        </div>
      </header>

      {showShare && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowShare(false)}>
          <div className={`absolute inset-0 ${theme ? 'bg-black/80' : 'bg-black/60'} backdrop-blur-sm`}></div>
          <div className={`relative w-full max-w-md rounded-t-[2rem] p-6 ${theme ? 'bg-gray-900' : 'bg-white'} shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-black text-center mb-6">Compartir en...</h2>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={shareWhatsApp} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-500 text-white">
                <span className="text-3xl">💬</span>
                <span className="text-xs font-bold">WhatsApp</span>
              </button>
              <button onClick={shareX} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black text-white">
                <span className="text-3xl">✖</span>
                <span className="text-xs font-bold">X</span>
              </button>
              <button onClick={shareFacebook} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-600 text-white">
                <span className="text-3xl">📘</span>
                <span className="text-xs font-bold">Facebook</span>
              </button>
              <button onClick={shareInstagram} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 text-white">
                <span className="text-3xl">📷</span>
                <span className="text-xs font-bold">Instagram</span>
              </button>
              <button onClick={shareTikTok} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black text-white">
                <span className="text-3xl">🎵</span>
                <span className="text-xs font-bold">TikTok</span>
              </button>
              <button onClick={shareGmail} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-500 text-white">
                <span className="text-3xl">📧</span>
                <span className="text-xs font-bold">Gmail</span>
              </button>
            </div>
            <button onClick={() => setShowShare(false)} className="w-full mt-6 py-3 font-bold text-gray-400">Cancelar</button>
          </div>
        </div>
      )}

      {showMenu && (
        <div className={`fixed inset-0 z-40 ${theme ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-xl p-6`}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black">Menu</h2>
            <button onClick={() => setShowMenu(false)} className="text-3xl">✕</button>
          </div>
          <nav className="space-y-4">
            <button onClick={() => router.push('/')} className="w-full block p-4 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black text-lg text-center shadow-lg">🏠 Inicio</button>
            <a href="/admin" className="block p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-lg text-center shadow-lg">🔐 Panel Admin</a>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" className="block p-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black text-lg text-center shadow-lg">📱 WhatsApp</a>
          </nav>
        </div>
      )}

      {!productoSeleccionado ? (
        <main className="max-w-lg mx-auto p-4 space-y-6 relative z-10">
          {ganadores.length > 0 && (
            <div className={`rounded-3xl p-4 ${theme ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-300'}`}>
              <h2 className="font-black text-lg mb-3 flex items-center gap-2">
                <span className="animate-bounce inline-block">🏆</span> GANADORES ANTERIORES
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
            <button onClick={() => setCategoriaActiva(null)} className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm ${!categoriaActiva ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : theme ? 'bg-white/10 text-white' : 'bg-black/10'}`}>
              Todos 🔥
            </button>
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)} className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm ${categoriaActiva === cat.id ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' : theme ? 'bg-white/10 text-white' : 'bg-black/10'}`}>
                {cat.nombre}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {productos.map(prod => (
              <div key={prod.id} onClick={() => setProductoSeleccionado(prod)} className={`cursor-pointer rounded-3xl overflow-hidden ${theme ? 'bg-white/5 border border-white/10' : 'bg-white shadow-xl'} ${prod.finalizado ? 'opacity-50' : ''}`}>
                <div className={`aspect-square ${theme ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20' : 'bg-gradient-to-br from-pink-100 to-purple-100'} flex items-center justify-center relative`}>
                  {prod.imagen ? <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover" /> : <span className="text-6xl">🎁</span>}
                  <span className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">{prod.categorias?.nombre}</span>
                  {prod.finalizado && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-4xl">🏆</span></div>}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm truncate">{prod.nombre}</h3>
                  <p className="text-pink-500 font-black">{prod.precio}</p>
                  <button className="w-full mt-2 bg-gradient-to-r from-pink-500 to-cyan-500 text-white font-bold py-2 rounded-xl text-sm">{prod.finalizado ? 'FINALIZADO' : 'VER NUMEROS →'}</button>
                </div>
              </div>
            ))}
          </div>

          {productos.length === 0 && (
            <div className={`text-center py-16 rounded-3xl ${theme ? 'bg-white/5' : 'bg-gray-50'}`}>
              <span className="text-6xl mb-4 block">🎰</span>
              <p className="text-xl font-black">Proximamente</p>
              <p className={`mt-2 ${theme ? 'text-gray-500' : 'text-gray-400'}`}>Nuevas rifas muy pronto!</p>
            </div>
          )}
        </main>
      ) : (
        <main className="max-w-lg mx-auto p-4 space-y-4 relative z-10">
          <button onClick={() => { setProductoSeleccionado(null); setSeleccionado(null); }} className="flex items-center gap-2 font-bold">
            <span>←</span> Volver
          </button>

          <div className={`rounded-3xl overflow-hidden ${theme ? 'bg-white/5 border border-white/10' : 'bg-white shadow-xl'}`}>
            <div className={`aspect-video ${theme ? 'bg-gradient-to-br from-pink-500/30 to-purple-500/30' : 'bg-gradient-to-br from-pink-100 to-purple-100'} flex items-center justify-center relative`}>
              {productoSeleccionado.imagen ? <img src={productoSeleccionado.imagen} alt={productoSeleccionado.nombre} className="w-full h-full object-contain" /> : <span className="text-7xl">🎁</span>}
              {productoSeleccionado.finalizado && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-6xl">🏆</span></div>}
            </div>
            <div className="p-4">
              <span className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">{productoSeleccionado.categorias?.nombre}</span>
              <h2 className="font-black text-xl mt-2">{productoSeleccionado.nombre}</h2>
              <p className="text-3xl font-black text-pink-500 mt-1">{productoSeleccionado.precio}</p>
              <div className="mt-3 flex justify-between text-sm">
                <span className={theme ? 'text-gray-400' : 'text-gray-500'}>{vendidosCount}/100 vendidos</span>
                <span className="font-bold">{porcentaje}%</span>
              </div>
              <div className={`h-3 rounded-full mt-2 ${theme ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div className="h-full bg-gradient-to-r from-pink-500 to-cyan-500 rounded-full" style={{ width: `${porcentaje}%` }}></div>
              </div>
              {vendidosCount === 100 && <p className="mt-2 text-center font-black text-yellow-500 animate-pulse">🎉 TODOS LOS NUMEROS VENDIDOS!</p>}
            </div>
          </div>

          {!productoSeleccionado.finalizado && (
            <>
              <div className={`rounded-3xl p-4 ${theme ? 'bg-white/5 border border-white/10' : 'bg-white shadow-xl'}`}>
                <p className="text-center font-black text-sm mb-3">🎰 ELEGÍ TU NUMERO</p>
                <div className="grid grid-cols-10 gap-1.5">
                  {boletos.map(b => (
                    <button key={b.id} disabled={b.estado === 'vendido'} onClick={() => handleSeleccionarNumero(b.numero)} className={`h-10 rounded-lg font-black text-xs transition-all active:scale-90 ${b.estado === 'vendido' ? 'bg-gradient-to-b from-gray-800 to-black text-white shadow-inner cursor-not-allowed' : 'bg-gradient-to-b from-pink-400 to-pink-600 text-white shadow-lg shadow-pink-500/50 hover:scale-110'}`}>
                      {String(b.numero).padStart(2, '0')}
                    </button>
                  ))}
                </div>
                <div className="flex justify-center gap-4 mt-3 text-xs font-bold">
                  <span><span className="w-3 h-3 inline-block bg-pink-400 rounded mr-1"></span>Libre</span>
                  <span><span className="w-3 h-3 inline-block bg-gray-800 rounded mr-1"></span>Ocupado</span>
                </div>
              </div>

              <div className={`rounded-3xl p-4 text-center ${theme ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30' : 'bg-gradient-to-r from-pink-100 to-purple-100'}`}>
                <p className="text-xs font-bold mb-1">💳 PAGÁ CON MERCADO PAGO</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-black text-pink-500">rifas.rosario.</p>
                  <button onClick={copyAlias} className="bg-pink-500 text-white px-2 py-1 rounded-lg text-xs font-bold">📋 Copiar</button>
                </div>
              </div>
            </>
          )}

          {productoSeleccionado.finalizado && productoSeleccionado.ganador_num && (
            <div className={`rounded-3xl p-6 text-center bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50`}>
              <span className="text-5xl">🏆</span>
              <p className="text-2xl font-black mt-2 text-yellow-500">GANADOR</p>
              <p className="text-5xl font-black text-white">#{String(productoSeleccionado.ganador_num).padStart(2,'0')}</p>
              <p className="text-lg font-bold mt-2">{productoSeleccionado.ganador_nombre}</p>
            </div>
          )}
        </main>
      )}

      {showReserva && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowReserva(false)}>
          <div className={`absolute inset-0 ${theme ? 'bg-black/80' : 'bg-black/60'} backdrop-blur-sm`}></div>
          <div className={`relative w-full max-w-md rounded-t-[2rem] p-6 ${theme ? 'bg-gray-900' : 'bg-white'} shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <div className="text-center mb-4">
              <p className="text-xs font-bold text-gray-400">NUMERO ELEGIDO</p>
              <p className="text-6xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">#{String(seleccionado).padStart(2,'0')}</p>
            </div>
            <div className={`p-4 rounded-2xl mb-4 ${theme ? 'bg-pink-500/20' : 'bg-pink-50'}`}>
              <p className="font-bold">{productoSeleccionado?.nombre}</p>
              <p className="text-xl font-black text-pink-500">{productoSeleccionado?.precio}</p>
            </div>
            <div className={`text-center p-3 rounded-xl mb-4 ${theme ? 'bg-white/10' : 'bg-gray-100'}`}>
              <p className="text-xs font-bold text-gray-400">Alias de Pago</p>
              <p className="text-lg font-black text-pink-500">rifas.rosario.</p>
                <button onClick={copyAlias} className="bg-pink-500 text-white px-2 py-1 rounded-lg text-xs font-bold">📋 Copiar</button>
            </div>
            <form onSubmit={handleReserva} className="space-y-3">
              <input placeholder="Tu nombre completo" required value={reservaForm.nombre} onChange={e => setReservaForm({...reservaForm, nombre: e.target.value})} className={`w-full rounded-xl p-3.5 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
              <input placeholder="Tu WhatsApp" required value={reservaForm.whatsapp} onChange={e => setReservaForm({...reservaForm, whatsapp: e.target.value})} className={`w-full rounded-xl p-3.5 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
              <button disabled={loading} className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-black py-4 rounded-xl shadow-xl disabled:opacity-50">
                {loading ? '⏳...' : '📤 ENVIAR POR WHATSAPP'}
              </button>
            </form>
            <button onClick={() => setShowReserva(false)} className="w-full mt-3 py-2 font-bold text-gray-400">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
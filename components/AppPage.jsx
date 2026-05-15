'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
import LogoImg from '../public/logo.png';

export default function AppPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [boletos, setBoletos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [ganadores, setGanadores] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [fakeWatching, setFakeWatching] = useState(15);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [showBulkReserva, setShowBulkReserva] = useState(false);
  const [showReserva, setShowReserva] = useState(false);
  const [reservaForm, setReservaForm] = useState({ nombre: '', whatsapp: '' });
  const [showShare, setShowShare] = useState(false);
  const [showSorteo, setShowSorteo] = useState(false);
  const [sorteoCountdown, setSorteoCountdown] = useState(30);
  const [ganadorAnimado, setGanadorAnimado] = useState(null);
  const [showPremio, setShowPremio] = useState(false);
  const [showComoFunciona, setShowComoFunciona] = useState(false);
  const [allProductos, setAllProductos] = useState([]);
  const [allBoletos, setAllBoletos] = useState([]);
  const [liveNotif, setLiveNotif] = useState(null);
  const [showLiveNotif, setShowLiveNotif] = useState(false);
  const [hotProducts, setHotProducts] = useState([]);

  useEffect(() => {
    const names = ['Carlos', 'Maria', 'Jose', 'Ana', 'Luis', 'Sofia', 'Diego', 'Valentina', 'Martin', 'Camila', 'Tomas', 'Lucia', 'Franco', 'Florencia', 'Mateo', 'Rocio'];
    const nums = Array.from({length: 100}, (_, i) => i + 1);
    const interval = setInterval(() => {
      const fakeName = names[Math.floor(Math.random() * names.length)];
      const fakeNum = nums[Math.floor(Math.random() * nums.length)];
      const fakeProd = allProductos.filter(p => !p.finalizado);
      if (fakeProd.length > 0) {
        const prod = fakeProd[Math.floor(Math.random() * fakeProd.length)];
        setLiveNotif({ nombre: fakeName, numero: fakeNum, producto: prod.nombre, imagen: prod.imagen });
        setShowLiveNotif(true);
        setTimeout(() => setShowLiveNotif(false), 4000);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [allProductos]);

  const theme = true;
  const WHATSAPP = '5493416971479';
  const ALIAS = 'rifas.rosario.';
  const URL_APP = 'https://rifas-rosario.vercel.app/app';

    const formatPrice = (precio) => {
    if (!precio) return '';
    const num = parseFloat(String(precio).replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(num)) return precio;
    return '$ ' + num.toLocaleString('es-AR') + '-';
  };

  const getCategoryEmoji = (catName) => {
    const map = {
      'Tecnologia': '💻', 'Celulares': '📱', 'Zapatillas': '👟',
      'Hogar': '🏠', 'Electrodomesticos': '⚡', 'Herramientas': '🔧',
      'Deportes': '⚽', 'Indumentaria': '👕', 'Juegos': '🎮',
      'Belleza': '💄', 'Servicios': '🎯', 'Bazar': '🎪'
    };
    for (const [key, emoji] of Object.entries(map)) {
      if (catName?.toLowerCase().includes(key.toLowerCase())) return emoji;
    }
    return '🎁';
  };

  const copyAlias = () => {
    navigator.clipboard.writeText(ALIAS);
    alert('Alias copiado!');
  };

  useEffect(() => {
    const iv = setInterval(() => setFakeWatching(Math.floor(Math.random() * 30) + 8), 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetchCategorias();
    fetchProductos();
    fetchGanadores();
    if (supabase) {
      try {
        const sub = supabase.channel('cambios').on('postgres_changes', { event: '*', schema: 'public', table: 'boletos' }, () => {
          fetchProductos();
          fetchGanadores();
          if (productoSeleccionado) fetchBoletos(productoSeleccionado.id);
        }).on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
          fetchProductos();
          fetchGanadores();
        }).subscribe();
        return () => supabase.removeChannel(sub);
      } catch (e) { 
        console.log('Realtime no disponible, usando polling');
        const iv2 = setInterval(() => { fetchProductos(); fetchCategorias(); fetchGanadores(); }, 8000);
        return () => clearInterval(iv2);
      }
    }
  }, []);

  useEffect(() => { fetchProductos(); }, [categoriaActiva]);
  useEffect(() => { if (productoSeleccionado) fetchBoletos(productoSeleccionado.id); }, [productoSeleccionado]);

  useEffect(() => {
    allProductos.forEach(p => {
      const prodBoletos = allBoletos.filter(b => b.producto_id === p.id);
      const vendidos = prodBoletos.filter(b => b.estado === 'vendido').length;
      if (vendidos === 100 && !p.finalizado && !p.sorteo_notificado && !showSorteo) {
        notificarSorteoProximo(p, prodBoletos);
      }
    });
  }, [allProductos, allBoletos, showSorteo]);

  const notificarSorteoProximo = async (producto, prodBoletos) => {
    try {
      await supabase.from('productos').update({ sorteo_notificado: true }).eq('id', producto.id);
    } catch(e) { console.log('Error update'); }
    
    const vendidos = prodBoletos.filter(b => b.estado === 'vendido');
    const msgPrevio = '🎉 SORTEO EN VIVO! - RIFAS ROSARIO\n\n🎁 Producto: ' + producto.nombre + '\n💰 Todos los numeros fueron vendidos!\n\n⏰ El sorteo inicia en 30 SEGUNDOS!\n\n👉 Mira el sorteo en vivo ahora:\nhttps://rifas-rosario.vercel.app/app\n\nSuerte a todos! 🍀';
    
    vendidos.forEach((b, i) => {
      if (b.whatsapp) setTimeout(() => window.open('https://wa.me/' + b.whatsapp + '?text=' + encodeURIComponent(msgPrevio), '_blank'), i * 500);
    });
    
    setTimeout(() => window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('🎰 SORTEO PROXIMO: ' + producto.nombre + ' - Todos los 100 numeros vendidos!'), '_blank'), 500);
    setTimeout(() => iniciarSorteoAuto(producto, prodBoletos), 3000);
  };

  const iniciarSorteoAuto = async (producto, prodBoletos) => {
    setProductoSeleccionado(producto);
    setBoletos(prodBoletos);
    setShowSorteo(true);
    setShowPremio(false);
    setGanadorAnimado(null);
    setSorteoCountdown(30);
    
    let confettiInterval = setInterval(() => confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 }, colors: ['#ff0', '#f0f', '#0ff', '#f00', '#0f0'] }), 800);
    
    const intervalo = setInterval(() => {
      setSorteoCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalo);
          clearInterval(confettiInterval);
          seleccionarGanadorAuto(producto, prodBoletos);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const seleccionarGanadorAuto = async (producto, prodBoletos) => {
    const vendidos = prodBoletos.filter(b => b.estado === 'vendido');
    if (vendidos.length === 0) return;
    
    let animIndex = 0;
    const animInterval = setInterval(() => {
      setGanadorAnimado(vendidos[Math.floor(Math.random() * vendidos.length)].numero);
      if (++animIndex > 10) clearInterval(animInterval);
    }, 150);
    
    setTimeout(() => {
      clearInterval(animInterval);
      const winner = vendidos[Math.floor(Math.random() * vendidos.length)];
      setGanadorAnimado(winner.numero);
      
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#FFD700', '#FF1493', '#00BFFF'] });
      setTimeout(() => confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#FFD700', '#FF1493', '#00BFFF'] }), 200);
      setTimeout(() => confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#FFD700', '#FF1493', '#00BFFF'] }), 400);
      setTimeout(() => confetti({ particleCount: 300, spread: 360, origin: { y: 0.5 } }), 1200);
      
      supabase.from('productos').update({ finalizado: true, winner_num: winner.numero, winner_nombre: winner.nombre }).eq('id', producto.id);
      
      window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('🏆 GANADOR DEL SORTEO!\n\n🎁 Producto: ' + producto.nombre + '\n🏆 Numero Ganador: #' + String(winner.numero).padStart(2,'0') + '\n👤 Nombre: ' + winner.nombre + '\n📱 WhatsApp: ' + winner.whatsapp), '_blank');
      
      vendidos.forEach((b, i) => {
        if (b.whatsapp) {
          const msg = b.numero === winner.numero 
            ? '🎉🎉🎉 FELICIDADES! 🎉🎉🎉\n\nGanaste el SORTEO!\n\n🎁 Producto: ' + producto.nombre + '\n🏆 Tu numero: #' + String(winner.numero).padStart(2,'0') + '\n\nContacta al admin para reclamar tu premio!'
            : '😢 NO Fuiste el ganador esta vez\n\nTu numero: #' + String(b.numero).padStart(2,'0') + '\n🏆 Ganador: #' + String(winner.numero).padStart(2,'0') + '\n\nNo te pierdas las proximas rifas! https://rifas-rosario.vercel.app/app';
          setTimeout(() => window.open('https://wa.me/' + b.whatsapp + '?text=' + encodeURIComponent(msg), '_blank'), i * 1000);
        }
      });
      setTimeout(() => setShowPremio(true), 2000);
    });
  };

  const fetchCategorias = async () => {
    try {
      const res = await fetch('/api/productos');
      const result = await res.json();
      setCategorias(result.categorias || []);
    } catch (err) { console.error('Error:', err); }
  };

  const fetchProductos = async () => {
    try {
      const res = await fetch('/api/productos');
      const result = await res.json();
      setAllProductos(result.productos || []);
      setAllBoletos(result.boletos || []);
      if (result.productos) {
        setProductos(categoriaActiva ? result.productos.filter(p => p.categoria_id === categoriaActiva) : result.productos.filter(p => !p.finalizado));
      }
    } catch (err) { console.error('Error:', err); setProductos([]); }
  };

  const fetchBoletos = async (productoId) => {
    try {
      const res = await fetch('/api/productos');
      const result = await res.json();
      if (result.boletos) setBoletos(result.boletos.filter(b => b.producto_id === productoId));
    } catch (err) { console.error('Error:', err); }
  };

  const fetchGanadores = async () => {
    try {
      const res = await fetch('/api/productos');
      const result = await res.json();
      if (result.productos) setGanadores(result.productos.filter(p => p.finalizado).slice(0, 5));
    } catch (err) { console.error('Error:', err); }
  };

  const toggleNumberSelection = (numero) => {
    if (boletos.find(b => b.numero === numero && b.estado !== 'disponible')) return;
    setSelectedNumbers(prev => prev.includes(numero) ? prev.filter(n => n !== numero) : [...prev, numero]);
  };

  const openBulkReserva = () => { if (selectedNumbers.length > 0) { setShowBulkReserva(true); setReservaForm({ nombre: '', whatsapp: '' }); } };

  const handleBulkReserva = async (e) => {
    e.preventDefault();
    if (selectedNumbers.length === 0) return;
    setLoading(true);
    
    let successful = 0;
    for (const num of selectedNumbers) {
      try {
        const res = await fetch('/api/reservar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero: num,
            producto_id: productoSeleccionado.id,
            nombre: reservaForm.nombre,
            whatsapp: reservaForm.whatsapp
          })
        });
        const result = await res.json();
        if (result.success) successful++;
        else console.error('Error reserva #' + num + ':', result.error);
      } catch (err) {
        console.error('Error reservando #' + num + ':', err);
      }
    }
    
    if (successful > 0) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      const numsStr = selectedNumbers.map(n => '#' + String(n).padStart(2,'0')).join(', ');
      const total = formatPrice((parseFloat(productoSeleccionado.precio.replace(/[^\d.,]/g,'').replace(',','.')) * selectedNumbers.length).toString());
      const msg = '🎟️ RIFA RESERVADA - RIFAS ROSARIO\n\n✅ Numeros reservados: ' + numsStr + '\n🎁 Producto: ' + productoSeleccionado.nombre + '\n💰 Total: ' + selectedNumbers.length + ' x ' + formatPrice(productoSeleccionado.precio) + ' = ' + total + '\n\n👤 Nombre: ' + reservaForm.nombre + '\n📱 WhatsApp: ' + reservaForm.whatsapp + '\n\n💳 PAGÁ AHORA:\nAlias: rifas.rosario.\n\n📋 Enviame el comprobante de pago y reservo tus numeros!\n\n⏳ Tus numeros quedan RESERVADOS por 10 minutos.';
      window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank');
      setTimeout(() => { setShowBulkReserva(false); setSelectedNumbers([]); fetchBoletos(productoSeleccionado.id); }, 2000);
    } else {
      alert('Error al reservar. Probá de nuevo.');
    }
    setLoading(false);
  };

  const handleReserva = async (e) => {
    e.preventDefault();
    if (!seleccionado) return;
    setLoading(true);
    
    try {
      const res = await fetch('/api/reservar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: seleccionado,
          producto_id: productoSeleccionado.id,
          nombre: reservaForm.nombre,
          whatsapp: reservaForm.whatsapp
        })
      });
      const result = await res.json();
      
      if (result.success) {
        confetti({ particleCount: 30, spread: 40, origin: { y: 0.7 } });
        const msg = '🎟️ RIFA RESERVADA - RIFAS ROSARIO\n\n✅ Numero reservado: #' + String(seleccionado).padStart(2,'0') + '\n🎁 Producto: ' + productoSeleccionado.nombre + '\n💰 Precio: ' + formatPrice(productoSeleccionado.precio) + '\n\n👤 Nombre: ' + reservaForm.nombre + '\n📱 WhatsApp: ' + reservaForm.whatsapp + '\n\n💳 PAGÁ AHORA:\nAlias: rifas.rosario.\n\n📋 Enviame el comprobante de pago y reservo tu numero!\n\n⏳ Tu numero queda RESERVADO por 10 minutos.';
        window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(msg), '_blank');
        setTimeout(() => { setShowReserva(false); setSeleccionado(null); fetchBoletos(productoSeleccionado.id); }, 2000);
      } else {
        alert('Error al reservar: ' + (result.error || 'desconocido'));
      }
    } catch (err) {
      console.error('Error en reserva:', err);
      alert('Error al reservar. Probá de nuevo.');
    }
    setLoading(false);
  };

  const handleSeleccionarNumero = (numero) => { setSeleccionado(numero); setShowReserva(true); setReservaForm({ nombre: '', whatsapp: '' }); confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } }); };

  const shareProduct = (prod) => window.open('https://wa.me/?text=' + encodeURIComponent('🔥 Mira esta rifa en RIFAS ROSARIO!\n\n🎁 ' + prod.nombre + '\n💰 ' + formatPrice(prod.precio) + '\n\nParticipá acá: ' + URL_APP));
  const shareWhatsApp = () => window.open('https://wa.me/?text=' + encodeURIComponent('Mira estas rifas increibles! 🎉 ' + URL_APP));
  const shareX = () => window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('Mira estas rifas increibles! 🎉 ' + URL_APP));
  const shareFacebook = () => window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(URL_APP));
  const shareInstagram = () => window.open('https://instagram.com');
  const shareTikTok = () => window.open('https://www.tiktok.com');
  const shareGmail = () => window.open('mailto:?subject=' + encodeURIComponent('Mira estas rifas increibles! 🎉') + '&body=' + encodeURIComponent('Echa un vistazo a esta app de rifas: ' + URL_APP));
  const contactarGanador = () => window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('🎊 FELICIDADES! Ganaste ' + productoSeleccionado?.nombre + '!\n\nQuiero coordinar la entrega de mi premio.'), '_blank');
  const verOtrosProductos = () => { setShowPremio(false); setShowSorteo(false); setProductoSeleccionado(null); setGanadorAnimado(null); };

  const vendidosCount = productoSeleccionado ? boletos.filter(b => b.estado === 'vendido').length : 0;
  const porcentaje = boletos.length > 0 ? Math.round((vendidosCount / boletos.length) * 100) : 0;

  return (
    <div className="min-h-screen pb-24 bg-black text-white">
      {showSorteo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl">
          <div className="text-center">
            {!showPremio ? (
              <>
                <p className="text-xl font-bold text-pink-500 mb-4">SORTEO EN PROGRESO</p>
                <div className="text-9xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent animate-pulse">{sorteoCountdown}</div>
                <p className="mt-6 text-gray-400">Esperando al ganador...</p>
                <div className="mt-8 flex justify-center gap-2 flex-wrap max-w-xs mx-auto">
                  {boletos.filter(b => b.estado === 'vendido').slice(0, 20).map(b => (
                    <span key={b.id} className={`px-2 py-1 rounded-lg text-sm font-bold ${ganadorAnimado === b.numero ? 'bg-yellow-500 text-black animate-bounce' : 'bg-white/10'}`}>#{String(b.numero).padStart(2,'0')}</span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="animate-bounce mb-6"><span className="text-8xl">🎊</span></div>
                <p className="text-2xl font-black text-yellow-500 mb-2">GANADOR!</p>
                <p className="text-8xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent animate-pulse">#{String(ganadorAnimado).padStart(2,'0')}</p>
                <p className="mt-4 text-xl font-bold">{boletos.find(b => b.numero === ganadorAnimado)?.nombre}</p>
                <p className="mt-2 text-pink-500 font-bold">{productoSeleccionado?.nombre}</p>
                <div className="mt-8 space-y-3">
                  <button onClick={contactarGanador} className="w-full bg-green-500 text-white font-black py-4 rounded-2xl text-lg">📱 Contactar para reclamar premio</button>
                  <button onClick={verOtrosProductos} className="w-full bg-pink-500 text-white font-black py-4 rounded-2xl text-lg">🎰 Ver otras rifas</button>
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

      {showLiveNotif && liveNotif && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] animate-slideDown">
          <div className="bg-gradient-to-r from-pink-600/90 to-purple-600/90 backdrop-blur-xl border border-pink-400/30 rounded-2xl px-5 py-3 shadow-2xl shadow-pink-500/30 flex items-center gap-3 min-w-[280px]">
            <div className="w-10 h-10 rounded-full bg-pink-400 flex items-center justify-center text-white font-black text-sm animate-pulse">🔴</div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">
                <span className="text-yellow-400">{liveNotif.nombre}</span> reservó <span className="text-cyan-400">#{String(liveNotif.numero).padStart(2,'0')}</span>
              </p>
              <p className="text-white/70 text-xs truncate">{liveNotif.producto}</p>
            </div>
            <span className="text-2xl animate-bounce">🎟️</span>
          </div>
        </div>
      )}

      {allProductos.filter(p => !p.finalizado).length > 0 && (() => {
        const totalVendidos = allProductos.filter(p => !p.finalizado).reduce((sum, p) => {
          const prodBoletos = allBoletos.filter(b => b.producto_id === p.id);
          return sum + prodBoletos.filter(b => b.estado === 'vendido').length;
        }, 0);
        const totalNumeros = allProductos.filter(p => !p.finalizado).length * 100;
        const totalPorcent = Math.round((totalVendidos / totalNumeros) * 100);
        return totalPorcent > 0 ? (
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-cyan-500/20 px-4 py-2">
            <div className="max-w-lg mx-auto flex items-center gap-3 text-xs">
              <span className="text-cyan-400 font-black animate-pulse">📊 EN VIVO</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" style={{ width: totalPorcent + '%' }}></div>
              </div>
              <span className="text-cyan-300 font-bold">{totalVendidos}/{totalNumeros}</span>
            </div>
          </div>
        ) : null;
      })()}

      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src={LogoImg} alt="Rifas Rosario" width={40} height={40} className="object-contain rounded-lg" />
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">RIFAS ROSARIO</h1>
              <p className="text-[10px] text-pink-400 font-bold">Tu mejor inversion!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShare(true)} className="p-2 rounded-full bg-white/10">📤</button>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full bg-white/10">{showMenu ? '✕' : '☰'}</button>
          </div>
        </div>
      </header>

      {showShare && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowShare(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-gray-900 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-black text-center mb-6">Compartir en...</h2>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={shareWhatsApp} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-500 text-white"><span className="text-3xl">💬</span><span className="text-xs font-bold">WhatsApp</span></button>
              <button onClick={shareX} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black text-white"><span className="text-3xl">✖</span><span className="text-xs font-bold">X</span></button>
              <button onClick={shareFacebook} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-600 text-white"><span className="text-3xl">📘</span><span className="text-xs font-bold">Facebook</span></button>
              <button onClick={shareInstagram} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 text-white"><span className="text-3xl">📷</span><span className="text-xs font-bold">Instagram</span></button>
              <button onClick={shareTikTok} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-black text-white"><span className="text-3xl">🎵</span><span className="text-xs font-bold">TikTok</span></button>
              <button onClick={shareGmail} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-red-500 text-white"><span className="text-3xl">📧</span><span className="text-xs font-bold">Gmail</span></button>
            </div>
            <button onClick={() => setShowShare(false)} className="w-full mt-6 py-3 font-bold text-gray-400">Cancelar</button>
          </div>
        </div>
      )}

      {showComoFunciona && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={() => setShowComoFunciona(false)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-gray-900 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-black text-center mb-6 bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">COMO FUNCIONAN LAS RIFAS?</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start"><span className="text-3xl">1️⃣</span><div><p className="font-black text-sm">ELEGÍ TU NÚMERO</p><p className="text-gray-400 text-sm">Seleccioná el número que más te guste de la rifa activa. Cada número es único!</p></div></div>
              <div className="flex gap-4 items-start"><span className="text-3xl">2️⃣</span><div><p className="font-black text-sm">RESERVÁ Y PAGÁ</p><p className="text-gray-400 text-sm">Completá tus datos y pagá via Mercado Pago al alias rifas.rosario.</p></div></div>
              <div className="flex gap-4 items-start"><span className="text-3xl">3️⃣</span><div><p className="font-black text-sm">ESPERÁ EL SORTEO</p><p className="text-gray-400 text-sm">Cuando se vendan los 100 números, se sortea automáticamente con un contador de 30 segundos!</p></div></div>
              <div className="flex gap-4 items-start"><span className="text-3xl">🎉</span><div><p className="font-black text-sm">SORTEO EN VIVO</p><p className="text-gray-400 text-sm">El sistema elige un número al azar. Si es el tuyo, GANASTE! Te notificamos por WhatsApp.</p></div></div>
              <div className="flex gap-4 items-start"><span className="text-3xl">🏆</span><div><p className="font-black text-sm">RECLAMÁ TU PREMIO</p><p className="text-gray-400 text-sm">Contactá al admin por WhatsApp y coordiná la entrega de tu premio!</p></div></div>
            </div>
            <button onClick={() => setShowComoFunciona(false)} className="w-full mt-6 btn-3d-cyan">ENTENDÍ! 💪</button>
          </div>
        </div>
      )}

      {showMenu && (
        <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black">Menu</h2>
            <button onClick={() => setShowMenu(false)} className="text-3xl">✕</button>
          </div>
          <nav className="space-y-4">
            <button onClick={() => { setShowMenu(false); setShowComoFunciona(true); }} className="w-full block p-4 rounded-2xl btn-3d-cyan text-lg">❓ Como Funciona?</button>
            <a href="/admin" className="block p-4 rounded-2xl btn-3d-yellow text-black text-lg text-center">🔐 Panel Admin</a>
            <a href={'https://wa.me/' + WHATSAPP} target="_blank" className="block p-4 rounded-2xl btn-3d-green text-lg">📱 WhatsApp</a>
          </nav>
        </div>
      )}

      {!productoSeleccionado ? (
        <main className="max-w-lg mx-auto p-4 space-y-6 relative z-10">
          {ganadores.length > 0 && (
            <div className="rounded-3xl p-4 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30">
              <h2 className="font-black text-lg mb-3 flex items-center gap-2"><span className="animate-bounce inline-block">🏆</span> GANADORES ANTERIORES</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {ganadores.map(g => (
                  <div key={g.id} className="flex-shrink-0 p-3 rounded-2xl bg-black/50">
                    <p className="font-black text-pink-500">#{String(g.ganador_num).padStart(2,'0')}</p>
                    <p className="text-xs text-gray-400">{g.ganador_nombre}</p>
                    <p className="text-[10px] text-gray-500">{g.nombre}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(() => {
            const heroProd = productos.find(p => !p.finalizado);
            const heroBoletos = allBoletos.filter(b => b.producto_id === heroProd?.id);
            const heroVendidos = heroBoletos.filter(b => b.estado === 'vendido').length;
            const heroRestantes = 100 - heroVendidos;
            const heroReservados = heroBoletos.filter(b => b.estado === 'reservado').length;
            const heroPorcent = Math.round((heroVendidos / 100) * 100);
            return heroProd ? (
              <div onClick={() => setProductoSeleccionado(heroProd)} className="cursor-pointer rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-white/10 shadow-2xl shadow-pink-500/20 relative group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-3xl opacity-20 group-hover:opacity-40 blur-xl transition-all duration-500"></div>
                <div className="relative aspect-[4/3]">
                  {heroProd.imagen ? <img src={heroProd.imagen} alt={heroProd.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" /> : <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center"><span className="text-8xl animate-pulse">🎁</span></div>}
                  <div className="absolute top-3 left-3 z-20 flex gap-2">
                    <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg animate-pulse">🔥 RIFA ACTIVA</span>
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-black px-3 py-1.5 rounded-full shadow-lg">{getCategoryEmoji(heroProd.categorias?.nombre)} {heroProd.categorias?.nombre}</span>
                  </div>
                  {heroRestantes <= 20 && heroRestantes > 0 && (
                    <div className="absolute top-3 right-3 z-20">
                      <span className="bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full animate-pulse">⚠️ SOLO {heroRestantes}!</span>
                    </div>
                  )}
                  {heroRestantes > 20 && (
                    <div className="absolute top-3 right-3 z-20">
                      <span className="bg-black/70 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">{heroRestantes} disponibles</span>
                    </div>
                  )}
                </div>
                <div className="relative z-20 p-5 -mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-white text-2xl font-black">{heroProd.nombre}</h2>
                    {heroPorcent >= 50 && <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-black px-2 py-0.5 rounded-full animate-pulse">🔥 TRENDING</span>}
                  </div>
                  <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-cyan-400">{formatPrice(heroProd.precio)}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400 font-bold">🎟 {heroVendidos}/100</span>
                      {heroReservados > 0 && <span className="text-yellow-400 font-bold">⏳ {heroReservados} reservados</span>}
                      <span className="text-gray-400">👁 {fakeWatching} mirando</span>
                    </div>
                    <div className="h-4 bg-white/10 rounded-full overflow-hidden relative">
                      <div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-full transition-all duration-1000" style={{ width: heroPorcent + '%' }}></div>
                      {heroPorcent > 0 && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer rounded-full" style={{ width: heroPorcent + '%' }}></div>}
                    </div>
                  </div>
                  <button className="w-full mt-4 btn-3d-pink flex items-center justify-center gap-2">
                    <span>🎰 PARTICIPAR</span>
                    <span className="text-lg">→</span>
                  </button>
                  {heroProd.descripcion && <p className="text-gray-500 text-xs mt-2 line-clamp-1">{heroProd.descripcion}</p>}
                </div>
              </div>
            ) : null;
          })()}

          <button onClick={() => setShowComoFunciona(true)} className="w-full bg-gray-900/80 border border-white/10 rounded-2xl p-4 text-center">
            <p className="font-black text-sm">❓ COMO FUNCIONAN LAS RIFAS?</p>
          </button>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setCategoriaActiva(null)} className={`flex-shrink-0 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-200 ${!categoriaActiva ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg shadow-pink-500/30 scale-105' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              🔥 Todas
            </button>
            {categorias.map(cat => {
              const prodCount = allProductos.filter(p => p.categoria_id === cat.id && !p.finalizado).length;
              return (
                <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)} className={`flex-shrink-0 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-200 ${categoriaActiva === cat.id ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30 scale-105' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {getCategoryEmoji(cat.nombre)} {cat.nombre} {prodCount > 0 && <span className="text-xs opacity-60">({prodCount})</span>}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {productos.map(prod => {
              const prodBoletos = allBoletos.filter(b => b.producto_id === prod.id);
              const prodVend = prodBoletos.filter(b => b.estado === 'vendido').length;
              const prodRes = prodBoletos.filter(b => b.estado === 'reservado').length;
              const prodPorcent = 100 - prodVend;
              const isHot = prodVend >= 50 && !prod.finalizado;
              return (
                <div key={prod.id} onClick={() => setProductoSeleccionado(prod)} className={`cursor-pointer rounded-2xl overflow-hidden bg-white/5 border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${prod.finalizado ? 'opacity-50 border-gray-800' : isHot ? 'border-yellow-500/40 shadow-lg shadow-yellow-500/10' : 'border-white/10'}`}>
                  <div className="relative aspect-square">
                    {prod.imagen ? <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/10 to-purple-500/10"><span className="text-5xl animate-pulse">{getCategoryEmoji(prod.categorias?.nombre)}</span></div>}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">{getCategoryEmoji(prod.categorias?.nombre)} {prod.categorias?.nombre}</span>
                    </div>
                    {isHot && <div className="absolute top-2 right-2"><span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">🔥 HOT</span></div>}
                    {prodPorcent <= 10 && !prod.finalizado && <div className="absolute top-2 right-2"><span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">⚠️ ULTIMOS!</span></div>}
                    {prod.finalizado && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-5xl animate-bounce">🏆</span></div>}
                    <button onClick={(e) => { e.stopPropagation(); shareProduct(prod); }} className="absolute bottom-2 left-2 bg-white/20 backdrop-blur-md text-white p-1.5 rounded-full text-xs hover:bg-white/40">📤</button>
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{100 - prodVend - prodRes} disp.</div>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-bold text-sm truncate">{prod.nombre}</h3>
                    <p className="text-pink-500 font-black text-sm">{formatPrice(prod.precio)}</p>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${prodVend >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-500 to-cyan-500'}`} style={{ width: prodVend + '%' }}></div>
                    </div>
                    <button className={`w-full py-2 rounded-xl font-black text-xs ${prod.finalizado ? 'bg-gray-700 text-gray-400' : 'bg-gradient-to-r from-pink-500 to-cyan-500 text-white shadow-lg'}`}>
                      {prod.finalizado ? '🏆 FINALIZADO' : prodVend >= 100 ? '🎉 SORTEANDO...' : `🎰 ${prodVend}/100`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {productos.length === 0 && (
            <div className="text-center py-16 rounded-3xl bg-white/5">
              <span className="text-6xl mb-4 block">🎰</span>
              <p className="text-xl font-black">Proximamente</p>
              <p className="mt-2 text-gray-500">Nuevas rifas muy pronto!</p>
            </div>
          )}
        </main>
      ) : (
        <main className="max-w-lg mx-auto p-4 space-y-4 relative z-10">
          <button onClick={() => { setProductoSeleccionado(null); setSeleccionado(null); }} className="flex items-center gap-2 font-bold">← Volver</button>
          <button onClick={() => shareProduct(productoSeleccionado)} className="w-full btn-3d-green text-sm">📤 COMPARTIR ESTA RIFA 🚀</button>

          <div className="rounded-3xl overflow-hidden bg-white/5 border border-white/10">
            <div className="relative aspect-video">
              {productoSeleccionado.imagen ? <img src={productoSeleccionado.imagen} alt={productoSeleccionado.nombre} className="w-full h-full object-contain" /> : <span className="text-7xl">🎁</span>}
              {productoSeleccionado.finalizado && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-6xl">🏆</span></div>}
            </div>
            <div className="p-4">
              <span className="bg-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">{productoSeleccionado.categorias?.nombre}</span>
              <h2 className="font-black text-xl mt-2">{productoSeleccionado.nombre}</h2>
              <p className="text-3xl font-black text-pink-500 mt-1">{formatPrice(productoSeleccionado.precio)}</p>
              {productoSeleccionado.descripcion && <p className="mt-3 text-gray-400 text-sm">{productoSeleccionado.descripcion}</p>}
              <div className="mt-3 flex justify-between text-sm"><span className="text-gray-400">{vendidosCount}/100 vendidos</span><span className="font-bold">{porcentaje}%</span></div>
              <div className="h-3 rounded-full mt-2 bg-white/10"><div className="h-full bg-gradient-to-r from-pink-500 to-cyan-500 rounded-full" style={{ width: porcentaje + '%' }}></div></div>
              {vendidosCount === 100 && <p className="mt-2 text-center font-black text-yellow-500 animate-pulse">🎉 TODOS LOS NUMEROS VENDIDOS!</p>}
            </div>
          </div>

          {!productoSeleccionado.finalizado && (
            <>
              <div className="rounded-3xl p-4 bg-gradient-to-br from-pink-500/5 to-purple-500/5 border border-pink-500/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-black text-sm flex items-center gap-2">🎰 ELEGÍ TU(S) NUMERO(S)</p>
                  <div className="flex gap-3 text-xs font-bold">
                    <span><span className="w-3 h-3 inline-block bg-gradient-to-b from-pink-400 to-pink-600 rounded mr-1 shadow-md"></span>Libre</span>
                    <span><span className="w-3 h-3 inline-block bg-gradient-to-b from-green-400 to-green-600 rounded mr-1 shadow-md"></span>Elegido</span>
                    <span><span className="w-3 h-3 inline-block bg-gradient-to-b from-yellow-500 to-yellow-700 rounded mr-1 shadow-inner"></span>Reservado</span>
                    <span><span className="w-3 h-3 inline-block bg-gradient-to-b from-gray-700 to-gray-900 rounded mr-1 shadow-inner"></span>Vendido</span>
                  </div>
                </div>
                <div className="grid grid-cols-10 gap-1.5">
                  {boletos.map(b => {
                    const isSelected = selectedNumbers.includes(b.numero);
                    const isReserved = b.estado === 'reservado';
                    const isSold = b.estado === 'vendido';
                    return (
                      <button key={b.id} disabled={isSold || isReserved} onClick={() => toggleNumberSelection(b.numero)} className={`h-10 rounded-lg font-black text-xs transition-all duration-150 active:scale-90 ${isSold ? 'bg-gradient-to-b from-gray-800 to-black text-gray-600 shadow-inner cursor-not-allowed' : isReserved ? 'bg-gradient-to-b from-yellow-700 to-yellow-900 text-yellow-400 shadow-inner cursor-not-allowed' : isSelected ? 'bg-gradient-to-b from-green-400 to-green-600 text-white shadow-lg shadow-green-500/50 scale-110 ring-2 ring-green-300' : 'bg-gradient-to-b from-pink-400 to-pink-600 text-white shadow-lg shadow-pink-500/40 hover:shadow-pink-500/60 hover:scale-110'}`}
                        title={isSold ? `#${String(b.numero).padStart(2,'0')} - Vendido` : isReserved ? `#${String(b.numero).padStart(2,'0')} - Reservado` : `#${String(b.numero).padStart(2,'0')} - Disponible`}>
                        {String(b.numero).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
                {selectedNumbers.length > 0 && (
                  <div className="mt-4 text-center animate-slideDown">
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-3 mb-3 border border-green-500/30">
                      <p className="font-black text-lg text-green-400">{selectedNumbers.length} {selectedNumbers.length === 1 ? 'número seleccionado' : 'números seleccionados'}</p>
                      <p className="text-xs text-gray-400">Seleccionados: {selectedNumbers.map(n => `#${String(n).padStart(2,'0')}`).join(', ')}</p>
                    </div>
                    <button onClick={openBulkReserva} className="w-full btn-3d-green text-lg">
                      🎟️ RESERVAR {selectedNumbers.length} {selectedNumbers.length === 1 ? 'NÚMERO' : 'NÚMEROS'}
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-3xl p-5 text-center bg-gradient-to-r from-pink-600/20 via-purple-600/20 to-cyan-600/20 border border-pink-500/30 shadow-lg shadow-pink-500/10">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-3xl">💳</span>
                  <p className="font-black text-sm">PAGÁ CON MERCADO PAGO</p>
                </div>
                <div className="flex items-center justify-center gap-3 bg-black/30 rounded-2xl p-3 backdrop-blur-sm">
                  <p className="text-2xl font-black text-pink-400 tracking-wider">rifas.rosario.</p>
                  <button onClick={copyAlias} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg hover:scale-105 transition-transform active:scale-95">
                    📋 COPIAR
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Transferí el monto exacto y envianos el comprobante</p>
              </div>
            </>
          )}

          {productoSeleccionado.finalizado && productoSeleccionado.ganador_num && (
            <div className="rounded-3xl p-6 text-center bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50">
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2.5rem] p-6 bg-gray-900 shadow-2xl border-t border-pink-500/30" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-1.5 bg-pink-500/50 rounded-full mx-auto mb-4"></div>
            <div className="text-center mb-4">
              <p className="text-xs font-bold text-gray-400">🌸 TU NÚMERO DE LA SUERTE</p>
              <p className="text-7xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent animate-pulse">#{String(seleccionado).padStart(2,'0')}</p>
            </div>
            <div className="p-4 rounded-2xl mb-4 bg-gradient-to-r from-pink-600/20 to-purple-600/20 border border-pink-500/20">
              <div className="flex items-center gap-3">
                {productoSeleccionado?.imagen && <img src={productoSeleccionado.imagen} className="w-16 h-16 rounded-xl object-cover" />}
                <div>
                  <p className="font-bold text-lg">{productoSeleccionado?.nombre}</p>
                  <p className="text-2xl font-black bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent">{formatPrice(productoSeleccionado?.precio)}</p>
                </div>
              </div>
            </div>
            <div className="text-center p-3 rounded-xl mb-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
              <p className="text-xs font-bold text-gray-400">💳 ALIAS MERCADO PAGO</p>
              <p className="text-xl font-black text-pink-400 tracking-wider">rifas.rosario.</p>
              <button onClick={copyAlias} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold mt-1 shadow-lg hover:scale-105 transition-transform">📋 COPIAR ALIAS</button>
            </div>
            <form onSubmit={handleReserva} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1 block">Tu nombre completo</label>
                <input placeholder="Ej: Juan Perez" required value={reservaForm.nombre} onChange={e => setReservaForm({...reservaForm, nombre: e.target.value})} className="w-full rounded-xl p-3.5 font-bold bg-white/10 border border-white/10 focus:border-pink-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1 block">Tu WhatsApp</label>
                <input placeholder="Ej: 5493416971479" required value={reservaForm.whatsapp} onChange={e => setReservaForm({...reservaForm, whatsapp: e.target.value})} className="w-full rounded-xl p-3.5 font-bold bg-white/10 border border-white/10 focus:border-pink-500 outline-none" />
              </div>
              <button disabled={loading} className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white font-black py-4 rounded-xl shadow-xl shadow-pink-500/30 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                {loading ? '⏳ RESERVANDO...' : '🎟️ RESERVAR Y PAGAR'}
              </button>
              <p className="text-[10px] text-center text-gray-500">Reservá tu número y te enviamos los datos de pago por WhatsApp</p>
            </form>
            <button onClick={() => setShowReserva(false)} className="w-full mt-3 py-3 font-bold text-gray-400 hover:text-white transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {showBulkReserva && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => { setShowBulkReserva(false); setSelectedNumbers([]); }}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2.5rem] p-6 bg-gray-900 shadow-2xl border-t border-green-500/30" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-1.5 bg-green-500/50 rounded-full mx-auto mb-4"></div>
            <div className="text-center mb-4">
              <p className="text-xs font-bold text-gray-400">TUS NÚMEROS DE LA SUERTE</p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {selectedNumbers.map(n => (
                  <span key={n} className="text-2xl font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">#{String(n).padStart(2,'0')}</span>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-2xl mb-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/20">
              <div className="flex items-center gap-3">
                {productoSeleccionado?.imagen && <img src={productoSeleccionado.imagen} className="w-16 h-16 rounded-xl object-cover" />}
                <div>
                  <p className="font-bold">{productoSeleccionado?.nombre}</p>
                  <p className="text-lg font-black text-green-400">{selectedNumbers.length} × {formatPrice(productoSeleccionado?.precio)}</p>
                  <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
                    {(() => {
                      try { const num = parseFloat(String(productoSeleccionado?.precio).replace(/[^\d.,]/g,'').replace(',','.')) * selectedNumbers.length; return '$ ' + num.toLocaleString('es-AR') + '-'; } catch { return ''; }
                    })()}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center p-3 rounded-xl mb-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
              <p className="text-xs font-bold text-gray-400">💳 ALIAS MERCADO PAGO</p>
              <p className="text-xl font-black text-pink-400 tracking-wider">rifas.rosario.</p>
              <button onClick={copyAlias} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold mt-1 shadow-lg hover:scale-105 transition-transform">📋 COPIAR ALIAS</button>
            </div>
            <form onSubmit={handleBulkReserva} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1 block">Tu nombre completo</label>
                <input placeholder="Ej: Juan Perez" required value={reservaForm.nombre} onChange={e => setReservaForm({...reservaForm, nombre: e.target.value})} className="w-full rounded-xl p-3.5 font-bold bg-white/10 border border-white/10 focus:border-green-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1 block">Tu WhatsApp</label>
                <input placeholder="Ej: 5493416971479" required value={reservaForm.whatsapp} onChange={e => setReservaForm({...reservaForm, whatsapp: e.target.value})} className="w-full rounded-xl p-3.5 font-bold bg-white/10 border border-white/10 focus:border-green-500 outline-none" />
              </div>
              <button disabled={loading} className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white font-black py-4 rounded-xl shadow-xl shadow-green-500/30 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                {loading ? '⏳ RESERVANDO...' : '🎟️ RESERVAR Y PAGAR'}
              </button>
              <p className="text-[10px] text-center text-gray-500">Tus números quedan reservados al enviar el comprobante</p>
            </form>
            <button onClick={() => { setShowBulkReserva(false); setSelectedNumbers([]); }} className="w-full mt-3 py-3 font-bold text-gray-400 hover:text-white transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 z-50">
        <div className="max-w-lg mx-auto flex justify-around">
          <button onClick={() => router.push('/feed')} className="flex flex-col items-center gap-1 text-gray-400"><span className="text-xl">🏆</span><span className="text-xs font-bold">Feed</span></button>
          <button onClick={() => router.push('/app')} className="flex flex-col items-center gap-1 text-pink-500"><span className="text-xl">🎰</span><span className="text-xs font-bold">Rifas</span></button>
          <button onClick={() => router.push('/profile')} className="flex flex-col items-center gap-1 text-gray-400"><span className="text-xl">👤</span><span className="text-xs font-bold">Perfil</span></button>
        </div>
      </nav>
    </div>
  );
}
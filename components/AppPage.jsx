'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
import ChatBox from '@/components/ChatBox';

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
  const [hotProducts, setHotProducts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const WHATSAPP = '5493412500029';
  const ALIAS = 'eco-rifas';
  const URL_APP = typeof window !== 'undefined' ? window.location.origin + '/app' : 'https://eco-rifas.vercel.app/app';

    const formatPrice = (precio) => {
    if (!precio) return '';
    if (typeof precio === 'number') return '$ ' + precio.toLocaleString('es-AR') + '-';
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

  const copyToClipboard = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(msg || 'Copiado!');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert(msg || 'Copiado!');
    }
  };

  const copyAlias = () => {
    copyToClipboard(ALIAS, 'Alias copiado!');
  };

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferredPrompt(null);
  };

  const shareApp = async () => {
    const url = URL_APP;
    const text = 'Mira estas rifas en Eco Rifas! 🎉 ' + url;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Eco Rifas 🎉', text, url });
        return;
      } catch {}
    }
    copyToClipboard(url, 'Link copiado para compartir!');
  };

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setCurrentUser(data.session?.user || null);
      });
    }
    fetchCategorias();
    fetchProductos();
    fetchGanadores();

    const handleInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

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
        return () => { supabase.removeChannel(sub); window.removeEventListener('beforeinstallprompt', handleInstallPrompt); };
      } catch (e) { 
        console.log('Realtime no disponible, usando polling');
        const iv2 = setInterval(() => { fetchProductos(); fetchCategorias(); fetchGanadores(); }, 8000);
        return () => { clearInterval(iv2); window.removeEventListener('beforeinstallprompt', handleInstallPrompt); };
      }
    }
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
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
    
    window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(
      '🎰 SORTEO PROXIMO: ' + (producto.title || producto.nombre) + ' - Todos los numeros vendidos!\n\n' +
      'Participantes: ' + vendidos.length + '\n' +
      'Ver sorteo: ' + URL_APP
    ), '_blank');
    
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
      
      supabase.from('productos').update({ finalizado: true, ganador_num: winner.numero, ganador_nombre: winner.nombre }).eq('id', producto.id);
      
      window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(
        '🏆 GANADOR DEL SORTEO!\n\n' +
        '🎁 Producto: ' + (producto.title || producto.nombre) + '\n' +
        '🏆 Numero Ganador: #' + String(winner.numero).padStart(2,'0') + '\n' +
        '👤 Nombre: ' + winner.nombre + '\n' +
        '📱 WhatsApp: ' + winner.whatsapp
      ), '_blank');
      
      if (winner.whatsapp) {
        window.open('https://wa.me/' + winner.whatsapp + '?text=' + encodeURIComponent(
          '🎉🎉🎉 FELICIDADES! 🎉🎉🎉\n\n' +
          'Ganaste el SORTEO!\n\n' +
          '🎁 Producto: ' + (producto.title || producto.nombre) + '\n' +
          '🏆 Tu numero: #' + String(winner.numero).padStart(2,'0') + '\n\n' +
          'Contacta al admin para reclamar tu premio!'
        ), '_blank');
      }
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
    let receiptUrl = '';
    if (receiptFile) {
      setUploadingReceipt(true);
      const fd = new FormData();
      fd.append('image', receiptFile);
      try {
        const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();
        if (uploadData.success) receiptUrl = uploadData.url;
      } catch (e) { console.log('Error subiendo comprobante'); }
      setUploadingReceipt(false);
    }
    
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
      const precioUnit = productoSeleccionado.raffle_price || parseFloat(String(productoSeleccionado.precio).replace(/[^\d.,]/g,'').replace(',','.'));
      const total = formatPrice((precioUnit * selectedNumbers.length).toString());
      const p = productoSeleccionado;
      const msg = '🎟️ RIFA RESERVADA - Eco Rifas\n\n✅ Numeros reservados: ' + numsStr + '\n🎁 Producto: ' + (p.title || p.nombre) + '\n💰 Total: ' + selectedNumbers.length + ' x ' + formatPrice(p.raffle_price || p.precio) + ' = ' + total + '\n\n👤 Nombre: ' + reservaForm.nombre + '\n📱 WhatsApp: ' + reservaForm.whatsapp + '\n\n💳 PAGÁ AHORA (Alias):\nAlias: eco-rifas\n\n' + (receiptUrl ? '📸 Comprobante: ' + receiptUrl + '\n\n' : '📋 Enviame el comprobante de pago y reservo tus numeros!\n\n') + '⏳ Tus numeros quedan RESERVADOS por 10 minutos.';
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
    let receiptUrl = '';
    if (receiptFile) {
      setUploadingReceipt(true);
      const fd = new FormData();
      fd.append('image', receiptFile);
      try {
        const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();
        if (uploadData.success) receiptUrl = uploadData.url;
      } catch (e) { console.log('Error subiendo comprobante'); }
      setUploadingReceipt(false);
    }
    
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
        const msg = '🎟️ RIFA RESERVADA - Eco Rifas\n\n✅ Numero reservado: #' + String(seleccionado).padStart(2,'0') + '\n🎁 Producto: ' + (productoSeleccionado.title || productoSeleccionado.nombre) + '\n💰 Precio: ' + formatPrice(productoSeleccionado.raffle_price || productoSeleccionado.precio) + '\n\n👤 Nombre: ' + reservaForm.nombre + '\n📱 WhatsApp: ' + reservaForm.whatsapp + '\n\n💳 PAGÁ AHORA (Alias):\nAlias: eco-rifas\n\n' + (receiptUrl ? '📸 Comprobante: ' + receiptUrl + '\n\n' : '📋 Enviame el comprobante de pago y reservo tu numero!\n\n') + '⏳ Tu numero queda RESERVADO por 10 minutos.';
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

  const shareProduct = (prod) => window.open('https://wa.me/?text=' + encodeURIComponent('🔥 Eco Rifas - ' + (prod.title || prod.nombre) + '\n💰 ' + formatPrice(prod.raffle_price || prod.precio) + '\n\nParticipá acá: ' + URL_APP));
  const shareWhatsApp = () => window.open('https://wa.me/?text=' + encodeURIComponent('Mira estas rifas increibles! 🎉 ' + URL_APP));
  const shareX = () => window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('Mira estas rifas increibles! 🎉 ' + URL_APP));
  const shareFacebook = () => window.open('https://www.facebook.com/sharer.php?u=' + encodeURIComponent(URL_APP) + '&quote=' + encodeURIComponent('Mira estas rifas increibles! 🎉'), '_blank', 'width=600,height=400');
  const shareInstagram = () => {
    const url = URL_APP;
    const msg = 'Mira estas rifas increibles! 🎉 ' + url;
    copyToClipboard(msg, 'Link copiado! Pegalo en tu Instagram 📷');
  };
  const shareTikTok = () => {
    const url = URL_APP;
    const msg = 'Mira estas rifas increibles! 🎉 ' + url;
    copyToClipboard(msg, 'Link copiado! Pegalo en tu TikTok 🎵');
  };
  const shareGmail = () => window.open('mailto:?subject=' + encodeURIComponent('Mira estas rifas increibles! 🎉') + '&body=' + encodeURIComponent('Echa un vistazo a esta app de rifas: ' + URL_APP));
  const contactarGanador = () => window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('🎊 FELICIDADES! Ganaste ' + (productoSeleccionado?.title || productoSeleccionado?.nombre) + '!\n\nQuiero coordinar la entrega de mi premio.'), '_blank');
  const verOtrosProductos = () => { setShowPremio(false); setShowSorteo(false); setProductoSeleccionado(null); setGanadorAnimado(null); };

  const vendidosCount = productoSeleccionado ? boletos.filter(b => b.estado === 'vendido').length : 0;
  const porcentaje = boletos.length > 0 ? Math.round((vendidosCount / boletos.length) * 100) : 0;

  return (
    <div className="min-h-screen pb-24 bg-[#F5F5F5] text-[#333]">
      {showSorteo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-xl">
          <div className="text-center">
            {!showPremio ? (
              <>
                <p className="text-xl font-bold text-[#3483FA] mb-4">SORTEO EN PROGRESO</p>
                <div className="text-9xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent animate-pulse">{sorteoCountdown}</div>
                <p className="mt-6 text-gray-500">Esperando al ganador...</p>
                <div className="mt-8 flex justify-center gap-2 flex-wrap max-w-xs mx-auto">
                  {boletos.filter(b => b.estado === 'vendido').slice(0, 20).map(b => (
                    <span key={b.id} className={`px-2 py-1 rounded-lg text-sm font-bold ${ganadorAnimado === b.numero ? 'bg-yellow-500 text-black animate-bounce' : 'bg-gray-100 text-gray-600'}`}>#{String(b.numero).padStart(2,'0')}</span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="animate-bounce mb-6"><span className="text-8xl">🎊</span></div>
                <p className="text-2xl font-black text-yellow-500 mb-2">GANADOR!</p>
                <p className="text-8xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent animate-pulse">#{String(ganadorAnimado).padStart(2,'0')}</p>
                <p className="mt-4 text-xl font-bold">{boletos.find(b => b.numero === ganadorAnimado)?.nombre}</p>
                <p className="mt-2 text-pink-500 font-bold">{productoSeleccionado?.title || productoSeleccionado?.nombre}</p>
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
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FFE600]/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#3483FA]/20 rounded-full blur-3xl"></div>
      </div>

      {allProductos.filter(p => !p.finalizado).length > 0 && (() => {
        const totalVendidos = allProductos.filter(p => !p.finalizado).reduce((sum, p) => {
          const prodBoletos = allBoletos.filter(b => b.producto_id === p.id);
          return sum + prodBoletos.filter(b => b.estado === 'vendido').length;
        }, 0);
        const totalNumeros = allProductos.filter(p => !p.finalizado).length * 100;
        const totalPorcent = Math.round((totalVendidos / totalNumeros) * 100);
        return totalPorcent > 0 ? (
          <div className="bg-[#F59E0B]/10 border-b border-[#F59E0B]/30 px-4 py-2">
            <div className="max-w-lg mx-auto flex items-center gap-3 text-xs">
              <span className="text-[#3483FA] font-black animate-pulse">📊 EN VIVO</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#3483FA] rounded-full" style={{ width: totalPorcent + '%' }}></div>
              </div>
              <span className="text-[#3483FA] font-bold">{totalVendidos}/{totalNumeros}</span>
            </div>
          </div>
        ) : null;
      })()}

      <header className="sticky top-0 z-50 bg-[#111827] border-b border-gray-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#F59E0B] rounded-lg flex items-center justify-center text-white font-black text-sm">ER</div>
            <div>
              <h1 className="text-xl font-black text-[#F59E0B]">ECO RIFAS</h1>
              <p className="text-[10px] text-gray-400 font-medium">los productos que amas, ahora los podes ganar en rifas economicas!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShare(true)} className="p-2 rounded-lg bg-white/10 text-white shadow-sm hover:bg-white/20 transition-colors">📤</button>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg bg-white/10 text-white shadow-sm hover:bg-white/20 transition-colors">{showMenu ? '✕' : '☰'}</button>
          </div>
        </div>
      </header>

      {showShare && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowShare(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-white shadow-2xl border-t-4 border-[#F59E0B]" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-[#EBEBEB] rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-black text-center mb-6 text-[#111827]">Compartir en...</h2>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={shareWhatsApp} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-[#39B54A] text-white shadow-sm"><span className="text-3xl">💬</span><span className="text-xs font-bold">WhatsApp</span></button>
              <button onClick={shareX} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-black text-white shadow-sm"><span className="text-3xl">✖</span><span className="text-xs font-bold">X</span></button>
              <button onClick={shareFacebook} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-[#3483FA] text-white shadow-sm"><span className="text-3xl">📘</span><span className="text-xs font-bold">Facebook</span></button>
              <button onClick={shareInstagram} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gradient-to-br from-[#405DE6] via-[#E1306C] to-[#FFDC80] text-white shadow-sm"><span className="text-3xl">📷</span><span className="text-xs font-bold">Instagram</span></button>
              <button onClick={shareTikTok} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-black text-white shadow-sm"><span className="text-3xl">🎵</span><span className="text-xs font-bold">TikTok</span></button>
              <button onClick={shareGmail} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-red-500 text-white shadow-sm"><span className="text-3xl">📧</span><span className="text-xs font-bold">Gmail</span></button>
            </div>
            <button onClick={() => setShowShare(false)} className="w-full mt-6 py-3 font-bold text-gray-500">Cancelar</button>
          </div>
        </div>
      )}

      {showComoFunciona && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={() => setShowComoFunciona(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-white shadow-2xl border-t-4 border-[#F59E0B]" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-black text-center mb-6 text-[#111827]">¿CÓMO FUNCIONAN LAS RIFAS?</h2>
            <div className="space-y-4">
              <div className="flex gap-4 items-start"><span className="text-3xl">🛒</span><div><p className="font-black text-sm text-[#333]">ELEGÍ TU PRODUCTO</p><p className="text-gray-500 text-sm">Navegá los productos populares y elegí el que más te guste. Solo 100 números por rifa.</p></div></div>
              <div className="flex gap-4 items-start"><span className="text-3xl">2️⃣</span><div><p className="font-black text-sm text-[#333]">ELEGÍ TUS NÚMEROS</p><p className="text-gray-500 text-sm">Seleccioná del 1 al 100. Comprando más números aumentás tus chances de ganar.</p></div></div>
              <div className="flex gap-4 items-start"><span className="text-3xl">3️⃣</span><div><p className="font-black text-sm text-[#333]">RESERVÁ Y PAGÁ</p><p className="text-gray-500 text-sm">Completá tus datos y pagá por transferencia al alias eco-rifas</p></div></div>
              <div className="flex gap-4 items-start"><span className="text-3xl">🀄</span><div><p className="font-black text-sm text-[#333]">SORTEO POR QUINIENA NACIONAL NOCTURNA</p><p className="text-gray-500 text-sm">Cuando se vendan los 100 números, el ganador se define con las últimas 2 cifras del sorteo Nocturna (21hs) de la Quiniela Nacional. 100% transparente.</p></div></div>
              <div className="flex gap-4 items-start"><span className="text-3xl">👨‍👩‍👧‍👦</span><div><p className="font-black text-sm text-[#333]">INVITÁ A TU FAMILIA Y AMIGOS</p><p className="text-gray-500 text-sm">Entre más participen, más chances tienen de ganar. Compartí la rifa con todos!</p></div></div>
              <div className="flex gap-4 items-start"><span className="text-3xl">🏆</span><div><p className="font-black text-sm text-[#333]">RECLAMÁ TU PREMIO</p><p className="text-gray-500 text-sm">Si ganaste, contactanos por WhatsApp y coordiná la entrega. Subí tu foto ganadora al chat!</p></div></div>
            </div>
            <button onClick={() => setShowComoFunciona(false)} className="w-full mt-6 bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-black py-4 rounded-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition-all">ENTENDÍ! 💪</button>
          </div>
        </div>
      )}

      {showMenu && (
        <div className="fixed inset-0 z-40 bg-[#111827]/95 backdrop-blur-xl p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-[#F59E0B]">Menu</h2>
            <button onClick={() => setShowMenu(false)} className="text-3xl text-white">✕</button>
          </div>
          <nav className="space-y-4">
            <button onClick={() => { setShowMenu(false); setShowComoFunciona(true); }} className="w-full block p-4 rounded-lg bg-gray-800 text-white font-bold text-lg text-center shadow-sm hover:bg-gray-700 transition-colors">❓ Cómo Funciona?</button>
            <button onClick={() => { shareApp(); setShowMenu(false); }} className="w-full block p-4 rounded-lg bg-[#F59E0B] text-black font-bold text-lg text-center shadow-sm hover:bg-[#D97706] transition-colors">📤 Compartir App</button>
            <a href="/admin" className="block p-4 rounded-lg bg-[#78350F] text-white font-bold text-lg text-center shadow-sm hover:bg-[#92400E] transition-colors">🔐 Panel Admin</a>
            <a href={'https://wa.me/' + WHATSAPP} target="_blank" className="block p-4 rounded-lg bg-[#39B54A] text-white font-bold text-lg text-center shadow-sm hover:bg-[#2d9e3d] transition-colors">📱 WhatsApp</a>
            {showInstall && <button onClick={() => { installApp(); setShowMenu(false); }} className="w-full block p-4 rounded-lg bg-gray-800 text-white font-bold text-lg text-center shadow-sm hover:bg-gray-700 transition-colors">📲 Instalar App</button>}
            <a href="/terminos" className="block p-4 rounded-lg bg-white/10 text-gray-300 font-bold text-lg text-center border border-gray-700 shadow-sm hover:bg-white/20 transition-colors">📜 Terminos y Condiciones</a>
          </nav>
        </div>
      )}

      {!productoSeleccionado ? (
        <main className="max-w-lg mx-auto p-4 space-y-6 relative z-10">
          {ganadores.length > 0 && (
            <div className="rounded-lg p-4 bg-white border border-[#EBEBEB] shadow-sm">
              <h2 className="font-black text-lg mb-3 flex items-center gap-2 text-[#333]"><span className="animate-bounce inline-block">🏆</span> GANADORES</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {ganadores.map(g => (
                  <div key={g.id} className="flex-shrink-0 p-3 rounded-lg bg-[#F5F5F5] border border-[#EBEBEB]">
                    <p className="font-black text-[#39B54A]">#{String(g.ganador_num).padStart(2,'0')}</p>
                    <p className="text-xs text-gray-600">{g.ganador_nombre}</p>
                    <p className="text-[10px] text-gray-400">{g.title || g.nombre}</p>
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
              <div onClick={() => setProductoSeleccionado(heroProd)} className="cursor-pointer rounded-lg overflow-hidden bg-white border border-[#EBEBEB] shadow-sm relative group">
                <div className="relative aspect-[4/3]">
                  {(heroProd.image || heroProd.imagen) ? <img src={heroProd.image || heroProd.imagen} alt={heroProd.title || heroProd.nombre} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center"><span className="text-8xl">🎁</span></div>}
                  <div className="absolute top-3 left-3 z-10 flex gap-2">
                    <span className="bg-[#3483FA] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">🔥 ACTIVA</span>
                    <span className="bg-[#FFE600] text-[#333] text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">{getCategoryEmoji(heroProd.categorias?.nombre)} {heroProd.categorias?.nombre}</span>
                  </div>
                  {heroRestantes <= 20 && heroRestantes > 0 && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg animate-pulse">⚠️ SOLO {heroRestantes}!</span>
                    </div>
                  )}
                  {heroRestantes > 20 && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="bg-white/90 text-[#666] text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">{heroRestantes} disponibles</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-[#333] text-2xl font-black">{heroProd.title || heroProd.nombre}</h2>
                    {heroPorcent >= 50 && <span className="bg-[#FFE600] text-[#333] text-xs font-bold px-2 py-0.5 rounded-lg">🔥 TRENDING</span>}
                  </div>
                  <p className="text-3xl font-black text-[#39B54A]">{formatPrice(heroProd.raffle_price || heroProd.precio)}</p>
                    <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#3483FA] font-bold">🎟 {heroVendidos}/100</span>
                      {heroReservados > 0 && <span className="text-[#FFE600] font-bold">⏳ {heroReservados} reservados</span>}
                    </div>
                    <div className="h-4 bg-[#EBEBEB] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3483FA] rounded-full transition-all duration-1000" style={{ width: heroPorcent + '%' }}></div>
                    </div>
                  </div>
                  <button className="w-full mt-4 btn-3d-blue flex items-center justify-center gap-2">
                    <span>🎰 PARTICIPAR</span>
                    <span className="text-lg">→</span>
                  </button>
                  {(heroProd.description || heroProd.descripcion) && <p className="text-gray-400 text-xs mt-2 line-clamp-1">{heroProd.description || heroProd.descripcion}</p>}
                </div>
              </div>
            ) : null;
          })()}

          <div className="flex gap-2">
            <button onClick={() => setShowComoFunciona(true)} className="flex-1 bg-white border border-[#EBEBEB] shadow-sm rounded-xl p-4 text-center hover:shadow-md transition-all active:scale-[0.98]">
              <p className="font-bold text-sm text-[#3483FA]">❓ CÓMO FUNCIONAN LAS RIFAS?</p>
            </button>
            <div className="flex-shrink-0 bg-gradient-to-r from-[#39B54A]/10 to-[#3483FA]/10 border border-[#39B54A]/20 rounded-xl p-3 flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <div className="text-[10px] leading-tight">
                <p className="font-bold text-[#39B54A]">100% Seguro</p>
                <p className="text-gray-500">Pago protegido</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setCategoriaActiva(null)} className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${!categoriaActiva ? 'bg-gradient-to-r from-[#3483FA] to-blue-500 text-white shadow-lg scale-105' : 'bg-white/70 text-[#666] hover:bg-white/90 border border-[#EBEBEB] hover:shadow-md'}`}>
              🔥 Todas
            </button>
            {categorias.map(cat => {
              const prodCount = allProductos.filter(p => p.categoria_id === cat.id && !p.finalizado).length;
              return (
                <button key={cat.id} onClick={() => setCategoriaActiva(cat.id)} className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${categoriaActiva === cat.id ? 'bg-gradient-to-r from-[#3483FA] to-blue-500 text-white shadow-lg scale-105' : 'bg-white/70 text-[#666] hover:bg-white/90 border border-[#EBEBEB] hover:shadow-md'}`}>
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
                <div key={prod.id} onClick={() => setProductoSeleccionado(prod)} className={`cursor-pointer rounded-lg overflow-hidden bg-white border transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-sm ${prod.finalizado ? 'opacity-50 border-gray-200' : isHot ? 'border-[#FFE600]' : 'border-[#EBEBEB]'}`}>
                  <div className="relative aspect-square">
                    {(prod.image || prod.imagen) ? <img src={prod.image || prod.imagen} alt={prod.title || prod.nombre} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-100"><span className="text-5xl">{getCategoryEmoji(prod.categorias?.nombre)}</span></div>}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="bg-white/90 text-[#666] text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">{getCategoryEmoji(prod.categorias?.nombre)} {prod.categorias?.nombre}</span>
                    </div>
                    {isHot && <div className="absolute top-2 right-2"><span className="bg-[#FFE600] text-[#333] text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">🔥 HOT</span></div>}
                    {prodPorcent <= 10 && !prod.finalizado && <div className="absolute top-2 right-2"><span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">⚠️ ULTIMOS!</span></div>}
                    {prod.finalizado && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><span className="text-5xl animate-bounce">🏆</span></div>}
                    <button onClick={(e) => { e.stopPropagation(); shareProduct(prod); }} className="absolute bottom-2 left-2 bg-white/80 text-[#333] p-1.5 rounded text-xs shadow-sm hover:bg-white">📤</button>
                    <div className="absolute bottom-2 right-2 bg-white/90 text-[#666] text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">{100 - prodVend - prodRes} disp.</div>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <h3 className="font-bold text-sm truncate text-[#333]">{prod.title || prod.nombre}</h3>
                    <p className="text-[#39B54A] font-black text-sm">{formatPrice(prod.raffle_price || prod.precio)}</p>
                    <div className="h-1.5 bg-[#EBEBEB] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${prodVend >= 100 ? 'bg-[#39B54A]' : 'bg-[#3483FA]'}`} style={{ width: prodVend + '%' }}></div>
                    </div>
                    <button className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${prod.finalizado ? 'bg-gray-100 text-gray-400 border border-gray-200' : 'bg-gradient-to-r from-[#3483FA] to-blue-600 text-white shadow-md hover:shadow-lg'}`}>
                      {prod.finalizado ? '🏆 FINALIZADO' : prodVend >= 100 ? '🎉 SORTEANDO...' : `🎰 ${prodVend}/100`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {productos.length === 0 && (
            <div className="text-center py-16 rounded-lg bg-white border border-[#EBEBEB] shadow-sm">
              <span className="text-6xl mb-4 block">🎰</span>
              <p className="text-xl font-black text-[#333]">Proximamente</p>
              <p className="mt-2 text-gray-500">Nuevas rifas muy pronto!</p>
            </div>
          )}

          {showInstall && (
            <button onClick={installApp} className="w-full bg-[#3483FA] text-white font-bold py-4 rounded-lg shadow-sm animate-bounce text-lg">
              📲 INSTALAR APP EN TU CELULAR
            </button>
          )}
        </main>
      ) : (
        <main className="max-w-lg mx-auto p-4 space-y-4 relative z-10">
          <button onClick={() => { setProductoSeleccionado(null); setSeleccionado(null); }} className="flex items-center gap-2 font-bold text-[#3483FA] hover:gap-3 transition-all">← Volver a rifas</button>
          <button onClick={() => shareProduct(productoSeleccionado)} className="w-full btn-3d-green text-sm">📤 COMPARTIR ESTA RIFA 🚀</button>

          <div className="rounded-lg overflow-hidden bg-white border border-[#EBEBEB] shadow-sm">
            <div className="relative aspect-video bg-gray-50">
              {(productoSeleccionado.image || productoSeleccionado.imagen) ? <img src={productoSeleccionado.image || productoSeleccionado.imagen} alt={productoSeleccionado.title || productoSeleccionado.nombre} className="w-full h-full object-contain" /> : <span className="text-7xl">🎁</span>}
              {productoSeleccionado.finalizado && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><span className="text-6xl">🏆</span></div>}
            </div>
            {(() => {
              try {
                const extraImages = productoSeleccionado.images ? JSON.parse(productoSeleccionado.images) : [];
                if (extraImages.length > 1) {
                  return (
                    <div className="flex gap-2 p-2 overflow-x-auto">
                      {extraImages.slice(1).map((url, i) => (
                        <img key={i} src={url} alt={`${productoSeleccionado.title || productoSeleccionado.nombre} ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-[#EBEBEB] flex-shrink-0" />
                      ))}
                    </div>
                  );
                }
              } catch(e) {}
              return null;
            })()}
            <div className="p-4">
              <span className="bg-[#3483FA]/10 text-[#3483FA] text-xs font-bold px-2 py-1 rounded">{productoSeleccionado.categorias?.nombre}</span>
              <h2 className="font-black text-xl mt-2 text-[#333]">{productoSeleccionado.title || productoSeleccionado.nombre}</h2>
              <p className="text-3xl font-black text-[#39B54A] mt-1">{formatPrice(productoSeleccionado.raffle_price || productoSeleccionado.precio)}</p>
              {(productoSeleccionado.description || productoSeleccionado.descripcion) && <p className="mt-3 text-gray-500 text-sm">{productoSeleccionado.description || productoSeleccionado.descripcion}</p>}
              <div className="mt-3 flex justify-between text-sm"><span className="text-gray-500">{vendidosCount}/100 vendidos</span><span className="font-bold text-[#333]">{porcentaje}%</span></div>
              <div className="h-3 rounded-full mt-2 bg-[#EBEBEB]"><div className="h-full bg-[#3483FA] rounded-full" style={{ width: porcentaje + '%' }}></div></div>
              {vendidosCount === 100 && <p className="mt-2 text-center font-black text-[#39B54A] animate-pulse">🎉 TODOS LOS NUMEROS VENDIDOS!</p>}
            </div>
          </div>

          {!productoSeleccionado.finalizado && (
            <>
              <div className="rounded-lg p-4 bg-white border border-[#EBEBEB] shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-sm flex items-center gap-2 text-[#333]">🎰 ELEGÍ TU(S) NUMERO(S)</p>
                  <div className="flex gap-2 text-[10px] font-medium">
                    <span><span className="w-3 h-3 inline-block bg-white border border-gray-300 rounded mr-1"></span>Libre</span>
                    <span><span className="w-3 h-3 inline-block bg-[#3483FA] rounded mr-1"></span>Elegido</span>
                    <span><span className="w-3 h-3 inline-block bg-[#FFE600] border border-yellow-400 rounded mr-1"></span>Reservado</span>
                    <span><span className="w-3 h-3 inline-block bg-gray-200 rounded mr-1"></span>Vendido</span>
                  </div>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {boletos.map(b => {
                    const isSelected = selectedNumbers.includes(b.numero);
                    const isReserved = b.estado === 'reservado';
                    const isSold = b.estado === 'vendido';
                    return (
                      <button key={b.id} disabled={isSold || isReserved} onClick={() => toggleNumberSelection(b.numero)} className={`h-9 rounded text-xs font-bold transition-all duration-150 active:scale-90 ${isSold ? 'bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200' : isReserved ? 'bg-[#FFE600] text-[#999] border border-yellow-300 cursor-not-allowed' : isSelected ? 'bg-[#3483FA] text-white scale-110 ring-2 ring-blue-200 border border-[#3483FA]' : 'bg-white text-[#333] border border-[#EBEBEB] hover:border-[#3483FA] hover:text-[#3483FA]'}`}
                        title={isSold ? `#${String(b.numero).padStart(2,'0')} - Vendido` : isReserved ? `#${String(b.numero).padStart(2,'0')} - Reservado` : `#${String(b.numero).padStart(2,'0')} - Disponible`}>
                        {String(b.numero).padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
                {selectedNumbers.length > 0 && (
                  <div className="mt-4 text-center">
                    <div className="bg-[#F5F5F5] rounded-lg p-3 mb-3 border border-[#EBEBEB]">
                      <p className="font-bold text-lg text-[#333]">{selectedNumbers.length} {selectedNumbers.length === 1 ? 'número seleccionado' : 'números seleccionados'}</p>
                      <p className="text-xs text-gray-500">Seleccionados: {selectedNumbers.map(n => `#${String(n).padStart(2,'0')}`).join(', ')}</p>
                    </div>
                    <button onClick={openBulkReserva} className="w-full btn-3d-gold text-lg">
                      🎟️ RESERVAR {selectedNumbers.length} {selectedNumbers.length === 1 ? 'NÚMERO' : 'NÚMEROS'}
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-lg p-5 text-center bg-white border border-[#EBEBEB] shadow-sm">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-3xl">💳</span>
                  <p className="font-bold text-sm text-[#333]">PAGÁ CON TRANSFERENCIA</p>
                </div>
                <div className="flex items-center justify-center gap-3 bg-[#F5F5F5] rounded-lg p-3">
                  <p className="text-2xl font-black text-[#333] tracking-wider">eco-rifas</p>
                  <button onClick={copyAlias} className="bg-[#3483FA] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-[#2d6fd4] transition-colors">
                    📋 COPIAR
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">Transferí el monto exacto y envianos el comprobante</p>
              </div>
            </>
          )}

          {productoSeleccionado.finalizado && productoSeleccionado.ganador_num && (
            <div className="rounded-lg p-6 text-center bg-white border-2 border-[#FFE600] shadow-sm">
              <span className="text-5xl">🏆</span>
              <p className="text-2xl font-black mt-2 text-[#FFE600]">GANADOR</p>
              <p className="text-5xl font-black text-[#333]">#{String(productoSeleccionado.ganador_num).padStart(2,'0')}</p>
              <p className="text-lg font-bold mt-2 text-[#333]">{productoSeleccionado.ganador_nombre}</p>
            </div>
          )}
        </main>
      )}

      {showReserva && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowReserva(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-white shadow-2xl border-t-4 border-[#F59E0B]" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-[#EBEBEB] rounded-full mx-auto mb-4"></div>
            <div className="text-center mb-4">
              <p className="text-xs font-bold text-gray-500">🎲 TU NÚMERO DE LA SUERTE</p>
              <p className="text-7xl font-black text-[#3483FA] animate-pulse">#{String(seleccionado).padStart(2,'0')}</p>
            </div>
            <div className="p-4 rounded-lg mb-4 bg-[#F5F5F5] border border-[#EBEBEB]">
              <div className="flex items-center gap-3">
                {(productoSeleccionado?.image || productoSeleccionado?.imagen) && <img src={productoSeleccionado.image || productoSeleccionado.imagen} className="w-16 h-16 rounded-lg object-cover" />}
                <div>
                  <p className="font-bold text-lg text-[#333]">{productoSeleccionado?.title || productoSeleccionado?.nombre}</p>
                  <p className="text-2xl font-black text-[#39B54A]">{formatPrice(productoSeleccionado?.raffle_price || productoSeleccionado?.precio)}</p>
                </div>
              </div>
            </div>
            <div className="text-center p-3 rounded-lg mb-4 bg-[#FFE600]/10 border border-[#FFE600]/30">
              <p className="text-xs font-bold text-gray-500">💳 ALIAS PARA TRANSFERENCIA</p>
              <p className="text-xl font-black text-[#333] tracking-wider">eco-rifas</p>
              <button onClick={copyAlias} className="bg-[#F59E0B] text-black px-4 py-1.5 rounded-lg text-xs font-bold mt-1 shadow-sm hover:bg-[#D97706] transition-colors">📋 COPIAR ALIAS</button>
            </div>
            <form onSubmit={handleReserva} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tu nombre completo</label>
                <input placeholder="Ej: Juan Perez" required value={reservaForm.nombre} onChange={e => setReservaForm({...reservaForm, nombre: e.target.value})} className="w-full rounded-lg p-3.5 font-bold bg-white border border-[#EBEBEB] focus:border-[#3483FA] outline-none text-[#333]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tu WhatsApp</label>
                <input placeholder="Ej: 5493412500029" required value={reservaForm.whatsapp} onChange={e => setReservaForm({...reservaForm, whatsapp: e.target.value})} className="w-full rounded-lg p-3.5 font-bold bg-white border border-[#EBEBEB] focus:border-[#3483FA] outline-none text-[#333]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Comprobante de pago (opcional)</label>
                <input type="file" accept="image/*" onChange={e => setReceiptFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#3483FA] file:text-white hover:file:bg-[#2d6fd4]" />
              </div>
              <button disabled={loading} className="w-full btn-3d-gold disabled:opacity-50">
                {loading ? '⏳ RESERVANDO...' : '🎟️ RESERVAR Y PAGAR'}
              </button>
              <p className="text-[10px] text-center text-gray-500">Reservá tu número y te enviamos los datos de pago por WhatsApp</p>
            </form>
            <button onClick={() => setShowReserva(false)} className="w-full mt-3 py-3 font-bold text-gray-400 hover:text-black transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {showBulkReserva && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => { setShowBulkReserva(false); setSelectedNumbers([]); }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-white shadow-2xl border-t-4 border-[#F59E0B]" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-[#EBEBEB] rounded-full mx-auto mb-4"></div>
            <div className="text-center mb-4">
              <p className="text-xs font-bold text-gray-500">TUS NÚMEROS DE LA SUERTE</p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {selectedNumbers.map(n => (
                  <span key={n} className="text-2xl font-black text-[#3483FA]">#{String(n).padStart(2,'0')}</span>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-lg mb-4 bg-[#F5F5F5] border border-[#EBEBEB]">
              <div className="flex items-center gap-3">
                {(productoSeleccionado?.image || productoSeleccionado?.imagen) && <img src={productoSeleccionado.image || productoSeleccionado.imagen} className="w-16 h-16 rounded-lg object-cover" />}
                <div>
                  <p className="font-bold text-[#333]">{productoSeleccionado?.title || productoSeleccionado?.nombre}</p>
                  <p className="text-lg font-black text-[#39B54A]">{selectedNumbers.length} × {formatPrice(productoSeleccionado?.raffle_price || productoSeleccionado?.precio)}</p>
                  <p className="text-2xl font-black text-[#333]">
                    {(() => {
                      try { const rf = productoSeleccionado?.raffle_price || parseFloat(String(productoSeleccionado?.precio).replace(/[^\d.,]/g,'').replace(',','.')); const num = rf * selectedNumbers.length; return '$ ' + num.toLocaleString('es-AR') + '-'; } catch { return ''; }
                    })()}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center p-3 rounded-lg mb-4 bg-[#FFE600]/10 border border-[#FFE600]/30">
              <p className="text-xs font-bold text-gray-500">💳 ALIAS PARA TRANSFERENCIA</p>
              <p className="text-sm font-black text-[#333] mt-1">eco-rifas</p>
              <button onClick={() => { navigator.clipboard?.writeText('eco-rifas'); }} className="mt-1 text-xs text-[#3483FA] font-bold">📋 COPIAR</button>
            </div>
            <form onSubmit={handleBulkReserva} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tu nombre completo</label>
                <input placeholder="Ej: Juan Perez" required value={reservaForm.nombre} onChange={e => setReservaForm({...reservaForm, nombre: e.target.value})} className="w-full rounded-lg p-3.5 font-bold bg-white border border-[#EBEBEB] focus:border-[#3483FA] outline-none text-[#333]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tu WhatsApp</label>
                <input placeholder="Ej: 5493412500029" required value={reservaForm.whatsapp} onChange={e => setReservaForm({...reservaForm, whatsapp: e.target.value})} className="w-full rounded-lg p-3.5 font-bold bg-white border border-[#EBEBEB] focus:border-[#3483FA] outline-none text-[#333]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Comprobante de pago (opcional)</label>
                <input type="file" accept="image/*" onChange={e => setReceiptFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#3483FA] file:text-white hover:file:bg-[#2d6fd4]" />
              </div>
              <button disabled={loading} className="w-full btn-3d-gold disabled:opacity-50">
                {loading ? '⏳ RESERVANDO...' : '🎟️ RESERVAR Y PAGAR'}
              </button>
              <p className="text-[10px] text-center text-gray-500">Tus números quedan reservados al enviar el comprobante</p>
            </form>
            <button onClick={() => { setShowBulkReserva(false); setSelectedNumbers([]); }} className="w-full mt-3 py-3 font-bold text-gray-400 hover:text-black transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <ChatBox
        user={currentUser}
        productos={allProductos}
        allBoletos={allBoletos}
      />

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EBEBEB] px-4 py-3 z-50 shadow-[0_-1px_6px_rgba(0,0,0,0.05)]">
        <div className="max-w-lg mx-auto flex justify-around">
          <button onClick={() => router.push('/feed')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#3483FA] transition-colors"><span className="text-xl">🏆</span><span className="text-xs font-bold">Feed</span></button>
          <button onClick={() => router.push('/app')} className="flex flex-col items-center gap-1 text-[#3483FA]"><span className="text-xl">🎰</span><span className="text-xs font-bold">Rifas</span></button>
          <button onClick={() => router.push('/profile')} className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#3483FA] transition-colors"><span className="text-xl">👤</span><span className="text-xs font-bold">Perfil</span></button>
          {showInstall && <button onClick={installApp} className="flex flex-col items-center gap-1 text-[#FFE600]"><span className="text-xl">📲</span><span className="text-xs font-bold">Instalar</span></button>}
        </div>
      </nav>
    </div>
  );
}
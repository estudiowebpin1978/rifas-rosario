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
  const [sorteoNotification, setSorteoNotification] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(null);
  const [favoriteNumbers, setFavoriteNumbers] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

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
const [toastMsg, setToastMsg] = useState(null);

const copyAlias = (e) => {
  e?.preventDefault && e.preventDefault();
  copyToClipboard(ALIAS, 'Alias copiado!');
  setToastMsg('Alias copiado al portapapeles');
};

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowInstall(false);
      setDeferredPrompt(null);
    } else {
      // Fallback: copy install instructions
      copyToClipboard('https://eco-rifas.vercel.app', 'Abrí eco-rifas.vercel.app desde tu navegador y seguí las instrucciones para instalar');
    }
  };

  const shareProduct = (prod) => {
    const prodName = prod.title || prod.nombre;
    const url = URL_APP + '?p=' + prod.id;
    const text = '🔥 MIRA ESTA RIFA!! ' + prodName + ' solo $' + formatPrice(prod.raffle_price || prod.precio) + ' - Eco Rifas 🎉 ' + url;
    if (navigator.share) {
      try { navigator.share({ title: 'Eco Rifas - ' + prodName, text, url }); return; } catch {}
    }
    copyToClipboard(url, 'Link de ' + prodName + ' copiado!');
  };

  const toggleFavorite = (productoId, numero) => {
    const key = productoId + '-' + numero;
    setFavoriteNumbers(prev => {
      const newFav = { ...prev };
      if (newFav[key]) delete newFav[key];
      else newFav[key] = true;
      try { localStorage.setItem('favNumbers', JSON.stringify(newFav)); } catch {}
      return newFav;
    });
  };

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('favNumbers');
      if (saved) setFavoriteNumbers(JSON.parse(saved));
    } catch {}
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
    loadFavorites();

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
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 2000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  useEffect(() => {
    const pendientes = allProductos.filter(p =>
      p.sorteo_programado && !p.finalizado && p.sorteo_notificado
    );
    pendientes.forEach(p => {
      if (!sorteoNotification) {
        setSorteoNotification(p);
      }
    });
  }, [allProductos]);

  useEffect(() => {
    if (!allBoletos || allBoletos.length === 0) return;
    const sold = allBoletos.filter(b => b.estado === 'vendido' || b.estado === 'reservado');
    if (sold.length === 0) return;
    const names = ['Carlos', 'María', 'Juan', 'Ana', 'Luis', 'Sofía', 'Pedro', 'Valentina', 'Diego', 'Camila', 'Martín', 'Lucía', 'Franco', 'Florencia', 'Nico'];
    const activities = sold.slice(-6).map(b => {
      const prod = allProductos.find(p => p.id === b.producto_id);
      const ts = b.updated_at || b.created_at;
      return {
        name: names[Math.floor(Math.random() * names.length)],
        number: b.numero,
        producto: prod?.title || prod?.nombre || 'Rifa',
        time: ts ? new Date(ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'ahora'
      };
    });
    setRecentActivity(activities);
  }, [allBoletos, allProductos]);

  const descartarSorteoNotification = () => setSorteoNotification(null);

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
                    <span key={b.id} className={`px-2 py-1 rounded-lg text-sm font-bold ${ganadorAnimado === b.numero ? 'bg-[#FE2C55] text-white animate-bounce' : 'bg-gray-100 text-gray-600'}`}>#{String(b.numero).padStart(2,'0')}</span>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="animate-bounce mb-6"><span className="text-8xl">🎊</span></div>
                <p className="text-2xl font-black text-[#FE2C55] mb-2">GANADOR!</p>
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

      {sorteoNotification && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center" onClick={descartarSorteoNotification}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-white shadow-2xl border-t-4 border-[#FE2C55]" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-[#EBEBEB] rounded-full mx-auto mb-4"></div>
            <div className="text-center">
              <span className="text-6xl block mb-4 animate-bounce">🎰</span>
              <h2 className="text-2xl font-black text-[#333]">SORTEO PROGRAMADO</h2>
              <p className="text-lg font-bold mt-3 text-[#3483FA]">{sorteoNotification.title || sorteoNotification.nombre}</p>
              <p className="text-sm text-gray-500 mt-2">
                {(() => {
                  const fecha = sorteoNotification.sorteo_fecha ? new Date(sorteoNotification.sorteo_fecha) : null;
                  if (fecha) {
                    return `El sorteo se realizará el ${fecha.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} mediante la Quiniela Nacional Nocturna.`;
                  }
                  return 'El sorteo se realizará mediante la Quiniela Nacional Nocturna.';
                })()}
              </p>
              <div className="mt-4 p-4 rounded-lg bg-[#25F4EE]/10 border border-[#25F4EE]/30">
                <p className="font-bold text-sm text-[#333]">🀄 Método de sorteo:</p>
                <p className="text-lg font-black text-[#FE2C55]">QUINIELA NACIONAL NOCTURNA</p>
              </div>
              <button onClick={descartarSorteoNotification} className="w-full btn-3d-pink">
                ENTENDIDO! ✅
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#25F4EE]/20 rounded-full blur-3xl"></div>
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
          <div className="bg-[#FE2C55]/10 border-b border-[#FE2C55]/30 px-4 py-2">
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
            <img src="/logo.svg" alt="Eco Rifas" className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-black text-[#FE2C55]">ECO RIFAS</h1>
              <p className="text-[10px] text-gray-400 font-medium">los productos que amas, ahora los podes ganar en rifas economicas!</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowShare(true)} className="p-2 rounded-lg bg-white/10 text-white shadow-sm hover:bg-white/20 transition-colors">📤</button>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg bg-white/10 text-white shadow-sm hover:bg-white/20 transition-colors">{showMenu ? '✕' : '☰'}</button>
          </div>
          </div>
        </header>

      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-[#111827] text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce border border-[#25F4EE]/30 text-sm font-bold whitespace-nowrap">
          {toastMsg}
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
          <button onClick={() => { if (deferredPrompt) installApp(); else router.push('/profile'); }} className="flex flex-col items-center gap-1 text-gray-400 hover:text-[#25F4EE] transition-colors"><span className="text-xl">📲</span><span className="text-xs font-bold">Instalar</span></button>
        </div>
      </nav>

      {/* Menu modal */}
      {showMenu && (
        <div className="fixed inset-0 z-40 bg-[#111827]/95 backdrop-blur-xl p-6">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-[#FE2C55]">Menú</h2>
            <button onClick={() => setShowMenu(false)} className="text-3xl text-white">✕</button>
          </div>
          <nav className="space-y-4">
            <button onClick={() => { setShowMenu(false); setShowComoFunciona(true); }} className="w-full block p-4 rounded-lg bg-gray-800 text-white font-bold text-lg text-center shadow-sm hover:bg-gray-700 transition-colors">❓ Cómo Funciona?</button>
            <button onClick={() => { shareApp(); setShowMenu(false); }} className="w-full btn-3d-pink">📤 Compartir App</button>
            <button onClick={() => { setShowShare(true); setShowMenu(false); }} className="w-full btn-3d-cyan">📲 Compartir en Redes</button>
            <a href={'https://wa.me/' + WHATSAPP} target="_blank" className="block p-4 rounded-lg bg-[#39B54A] text-white font-bold text-lg text-center shadow-sm hover:bg-[#2d9e3d] transition-colors">📱 WhatsApp</a>
            <button onClick={() => { installApp(); setShowMenu(false); }} className="w-full block p-4 rounded-lg bg-gray-800 text-white font-bold text-lg text-center shadow-sm hover:bg-gray-700 transition-colors">📲 Instalar App</button>
            <a href="/terminos" className="block p-4 rounded-lg bg-white/10 text-gray-300 font-bold text-lg text-center border border-gray-700 shadow-sm hover:bg-white/20 transition-colors">📜 Términos y Condiciones</a>
            <button onClick={async () => { if (supabase) { await supabase.auth.signOut(); } setShowMenu(false); }} className="w-full block p-4 rounded-lg bg-red-500/20 text-red-400 font-bold text-lg text-center border border-red-500/30 shadow-sm hover:bg-red-500/30 transition-colors">🚪 Cerrar Sesión</button>
          </nav>
        </div>
      )}

      {/* Cómo funciona modal */}
      {showComoFunciona && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={() => setShowComoFunciona(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-white shadow-2xl border-t-4 border-[#FE2C55]" onClick={e => e.stopPropagation()}>
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
            <button onClick={() => setShowComoFunciona(false)} className="w-full btn-3d-pink">ENTENDÍ! 💪</button>
          </div>
        </div>
      )}

      {/* Share social modal */}
      {showShare && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => setShowShare(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-white shadow-2xl border-t-4 border-[#FE2C55]" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-[#EBEBEB] rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-black text-center mb-6 text-[#111827]">Compartir en...</h2>
            <div className="grid grid-cols-4 gap-3">
              <button onClick={() => { shareWhatsApp(); setShowShare(false); }} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-[#39B54A] text-white shadow-sm hover:scale-105 transition-transform"><span className="text-3xl">💬</span><span className="text-xs font-bold">WhatsApp</span></button>
              <button onClick={() => { shareX(); setShowShare(false); }} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-black text-white shadow-sm hover:scale-105 transition-transform"><span className="text-3xl">𝕏</span><span className="text-xs font-bold">X</span></button>
              <button onClick={() => { shareFacebook(); setShowShare(false); }} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-[#3483FA] text-white shadow-sm hover:scale-105 transition-transform"><span className="text-3xl">📘</span><span className="text-xs font-bold">Facebook</span></button>
              <button onClick={() => { shareInstagram(); setShowShare(false); }} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white shadow-sm hover:scale-105 transition-transform"><span className="text-3xl">📷</span><span className="text-xs font-bold">Instagram</span></button>
              <button onClick={() => { shareTikTok(); setShowShare(false); }} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-black text-white shadow-sm hover:scale-105 transition-transform"><span className="text-3xl">🎵</span><span className="text-xs font-bold">TikTok</span></button>
              <button onClick={() => { shareGmail(); setShowShare(false); }} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-[#EA4335] text-white shadow-sm hover:scale-105 transition-transform"><span className="text-3xl">📧</span><span className="text-xs font-bold">Gmail</span></button>
              <button onClick={() => { shareApp(); setShowShare(false); }} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-[#111827] text-white shadow-sm hover:scale-105 transition-transform"><span className="text-3xl">🔗</span><span className="text-xs font-bold">Copiar Link</span></button>
            </div>
          </div>
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
                    <span className="bg-[#25F4EE] text-[#333] text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm">{getCategoryEmoji(heroProd.categorias?.nombre)} {heroProd.categorias?.nombre}</span>
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
                    {heroPorcent >= 50 && <span className="bg-[#25F4EE] text-[#333] text-xs font-bold px-2 py-0.5 rounded-lg">🔥 TRENDING</span>}
                  </div>
                  <p className="text-3xl font-black text-[#39B54A]">{formatPrice(heroProd.raffle_price || heroProd.precio)}</p>
                    <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#3483FA] font-bold">🎟 {heroVendidos}/100</span>
                      {heroReservados > 0 && <span className="text-[#25F4EE] font-bold">⏳ {heroReservados} reservados</span>}
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

          {/* 🎯 SOCIAL PROOF - Actividad reciente */}
          {recentActivity.length > 0 && (
            <div className="bg-gradient-to-r from-[#111827] to-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25F4EE] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25F4EE]"></span>
                </span>
                <p className="text-xs font-bold text-[#25F4EE] uppercase tracking-wider">🔥 Actividad Reciente</p>
              </div>
              <div className="space-y-2">
                {recentActivity.map((act, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-[#FE2C55] to-[#25F4EE] flex items-center justify-center text-white text-[10px] font-black">{act.name.charAt(0)}</span>
                    <span className="text-gray-300"><strong className="text-white">{act.name}</strong> eligió <strong className="text-[#25F4EE]">#{String(act.number).padStart(2,'0')}</strong></span>
                    <span className="ml-auto text-[10px] text-gray-500">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🚀 CONVERSION URGENCY */}
          <div className="text-center rounded-xl p-3 bg-gradient-to-r from-[#FE2C55]/10 to-[#25F4EE]/10 border border-[#FE2C55]/20 backdrop-blur-sm">
            <p className="text-xs font-bold text-[#111827]">🔥 <span className="text-[#FE2C55]">Miles</span> ya están participando · <span className="text-[#25F4EE]">¿El próximo ganador sos vos?</span></p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {productos.map(prod => {
              const prodBoletos = allBoletos.filter(b => b.producto_id === prod.id);
              const prodVend = prodBoletos.filter(b => b.estado === 'vendido').length;
              const prodRes = prodBoletos.filter(b => b.estado === 'reservado').length;
              const prodDisp = 100 - prodVend - prodRes;
              const prodPorcent = Math.round((prodVend / 100) * 100);
              const isHot = prodVend >= 50 && !prod.finalizado;
              const isAlmostFull = prodDisp <= 10 && !prod.finalizado;
              return (
                <div key={prod.id} onClick={() => { setProductoSeleccionado(prod); setSelectedImageIndex(0); }} className={`cursor-pointer rounded-xl overflow-hidden bg-white border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.97] ${prod.finalizado ? 'opacity-60 border-gray-200' : isHot ? 'border-[#25F4EE] shadow-[0_0_15px_rgba(37,244,238,0.2)]' : isAlmostFull ? 'border-[#FE2C55]' : 'border-[#EBEBEB] shadow-sm'}`}>
                  <div className="relative aspect-square bg-gray-50">
                    {(prod.image || prod.imagen) ? <img src={prod.image || prod.imagen} alt={prod.title || prod.nombre} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" /> : <div className="w-full h-full flex items-center justify-center"><span className="text-6xl opacity-50">{getCategoryEmoji(prod.categorias?.nombre)}</span></div>}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="bg-white/90 backdrop-blur-sm text-[#666] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{getCategoryEmoji(prod.categorias?.nombre)} {prod.categorias?.nombre}</span>
                    </div>
                    {isHot && <div className="absolute top-2 right-2"><span className="bg-gradient-to-r from-[#25F4EE] to-green-400 text-[#333] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">🔥 HOT</span></div>}
                    {isAlmostFull && !isHot && <div className="absolute top-2 right-2"><span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-bounce">⚠️ ÚLTIMOS!</span></div>}
                    {prod.finalizado && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"><span className="text-6xl animate-bounce">🏆</span></div>}
                    <button onClick={(e) => { e.stopPropagation(); shareProduct(prod); }} className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white p-2 rounded-full text-xs shadow-lg hover:bg-black/80 transition-all">📤</button>
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">{prodDisp} disp.</div>
                  </div>
                  <div className="p-3 space-y-2">
                    <h3 className="font-bold text-sm truncate text-[#111827]">{prod.title || prod.nombre}</h3>
                    <p className="text-[#39B54A] font-black text-base">{formatPrice(prod.raffle_price || prod.precio)}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-500">Vendidos</span>
                        <span className="font-bold text-[#111827]">{prodVend}/100</span>
                      </div>
                      <div className="h-2 bg-[#EBEBEB] rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-500 ${prodVend >= 100 ? 'bg-gradient-to-r from-[#39B54A] to-green-400' : prodVend >= 50 ? 'bg-gradient-to-r from-[#25F4EE] to-[#3483FA]' : 'bg-gradient-to-r from-[#3483FA] to-blue-400'}`} style={{ width: Math.min(prodPorcent, 100) + '%' }}></div>
                      </div>
                    </div>
                    <button className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all duration-200 active:scale-95 ${prod.finalizado ? 'bg-gray-100 text-gray-400 border border-gray-200' : prodVend >= 100 ? 'bg-gradient-to-r from-[#39B54A] to-green-500 text-white shadow-md' : 'bg-gradient-to-r from-[#111827] to-gray-800 text-white shadow-md hover:shadow-lg hover:from-[#3483FA] hover:to-blue-600'}`}>
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
              {(() => {
                try {
                  const allImgs = [];
                  if (productoSeleccionado.image || productoSeleccionado.imagen) allImgs.push(productoSeleccionado.image || productoSeleccionado.imagen);
                  const extra = productoSeleccionado.images ? JSON.parse(productoSeleccionado.images) : [];
                  extra.forEach(u => { if (u && !allImgs.includes(u)) allImgs.push(u); });
                  const currentImg = allImgs[selectedImageIndex] || allImgs[0];
                  return <><img src={currentImg} alt={productoSeleccionado.title || productoSeleccionado.nombre} className="w-full h-full object-contain cursor-pointer" onClick={() => setShowImageViewer(currentImg)} /><div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">🔍</div></>;
                } catch(e) { return <span className="text-7xl">🎁</span>; }
              })()}
              {productoSeleccionado.finalizado && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><span className="text-6xl">🏆</span></div>}
            </div>
            {(() => {
              try {
                const allImgs = [];
                if (productoSeleccionado.image || productoSeleccionado.imagen) allImgs.push(productoSeleccionado.image || productoSeleccionado.imagen);
                const extra = productoSeleccionado.images ? JSON.parse(productoSeleccionado.images) : [];
                extra.forEach(u => { if (u && !allImgs.includes(u)) allImgs.push(u); });
                if (allImgs.length > 1) {
                  return (
                    <div className="flex gap-2 p-2 overflow-x-auto scrollbar-hide">
                      {allImgs.map((url, i) => (
                        <img key={i} src={url} alt={`${productoSeleccionado.title || productoSeleccionado.nombre} ${i + 1}`}
                          className={`w-20 h-20 object-cover rounded-lg border-2 flex-shrink-0 cursor-pointer transition-all hover:opacity-90 ${i === selectedImageIndex ? 'border-[#FE2C55] shadow-md' : 'border-[#EBEBEB]'}`}
                          onClick={() => setSelectedImageIndex(i)} />
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
              {/* 💡 CONVERSION PSYCHOLOGY */}
              <div className="rounded-xl p-4 text-center bg-gradient-to-r from-[#111827] to-gray-800 border border-gray-700 shadow-lg">
                <p className="text-sm font-bold text-white">🎯 <span className="text-[#FE2C55]">Elegí tu número favorito</span> antes que otro lo ocupe · <span className="text-[#25F4EE]">¿Y si hoy es tu día de suerte?</span></p>
              </div>

              <div className="rounded-lg p-4 bg-white border border-[#EBEBEB] shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-sm flex items-center gap-2 text-[#111827]">🎰 ELEGÍ TU(S) NUMERO(S)</p>
                  <div className="flex gap-2 text-[10px] font-medium">
                    <span><span className="w-3 h-3 inline-block bg-white border border-gray-300 rounded mr-1"></span>Libre</span>
                    <span><span className="w-3 h-3 inline-block bg-[#3483FA] rounded mr-1"></span>Elegido</span>
                    <span><span className="w-3 h-3 inline-block bg-amber-400 rounded mr-1"></span>Reservado</span>
                    <span><span className="w-3 h-3 inline-block bg-gray-100 border border-red-200 rounded mr-1 font-bold flex items-center justify-center text-[8px]">✕</span>Pagado</span>
                  </div>
                </div>
                <div className="grid grid-cols-10 gap-1.5">
                  {boletos.map(b => {
                    const isSelected = selectedNumbers.includes(b.numero);
                    const isReserved = b.estado === 'reservado';
                    const isSold = b.estado === 'vendido';
                    const isFav = favoriteNumbers[productoSeleccionado.id + '-' + b.numero];
                    return (
                      <div key={b.id} className="relative">
                        <button disabled={isSold || isReserved} onClick={() => toggleNumberSelection(b.numero)} className={`w-full h-9 rounded-lg text-xs font-bold transition-all duration-150 ${isSold ? 'bg-gray-100 text-red-400 cursor-not-allowed border border-red-200' : isReserved ? 'bg-amber-100 text-amber-700 cursor-not-allowed border border-amber-300' : isSelected ? 'bg-[#3483FA] text-white border-2 border-[#3483FA] shadow-md scale-105' : isFav ? 'bg-yellow-50 text-[#111827] border-2 border-yellow-400 shadow-sm' : 'bg-white text-[#111827] border border-[#EBEBEB] hover:border-[#3483FA] hover:text-[#3483FA] hover:shadow-sm'}`}
                          title={isSold ? `#${String(b.numero).padStart(2,'0')} - Vendido` : isReserved ? `#${String(b.numero).padStart(2,'0')} - Reservado` : `#${String(b.numero).padStart(2,'0')} - ${isFav ? '⭐ Favorito' : 'Disponible'}`}>
                          {isSold ? '✕' : isReserved ? '✕' : String(b.numero).padStart(2, '0')}
                        </button>
                        {!isSold && !isReserved && (
                          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(productoSeleccionado.id, b.numero); }} className="absolute -top-1.5 -right-1.5 text-[10px] w-4 h-4 flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-200 hover:scale-110 transition-transform">{isFav ? '⭐' : '☆'}</button>
                        )}
                      </div>
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
            <div className="rounded-lg p-6 text-center bg-white border-2 border-[#25F4EE] shadow-sm">
              <span className="text-5xl">🏆</span>
              <p className="text-2xl font-black mt-2 text-[#25F4EE]">GANADOR</p>
              <p className="text-5xl font-black text-[#333]">#{String(productoSeleccionado.ganador_num).padStart(2,'0')}</p>
              <p className="text-lg font-bold mt-2 text-[#333]">{productoSeleccionado.ganador_nombre}</p>
            </div>
          )}
        </main>
      )}

      {showReserva && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowReserva(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-white shadow-2xl border-t-4 border-[#FE2C55]" onClick={e => e.stopPropagation()}>
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
            <div className="text-center p-3 rounded-lg mb-4 bg-[#25F4EE]/10 border border-[#25F4EE]/30">
              <p className="text-xs font-bold text-gray-500">💳 ALIAS PARA TRANSFERENCIA</p>
              <p className="text-xl font-black text-[#333] tracking-wider">eco-rifas</p>
              <button onClick={copyAlias} className="bg-[#FE2C55] text-black px-4 py-1.5 rounded-lg text-xs font-bold mt-1 shadow-sm hover:bg-[#C12045] transition-colors">📋 COPIAR ALIAS</button>
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
          <div className="relative w-full max-w-md rounded-t-[2rem] p-6 bg-white shadow-2xl border-t-4 border-[#FE2C55]" onClick={e => e.stopPropagation()}>
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
                      try { const rf = productoSeleccionado?.raffle_price || parseFloat(String(productoSeleccionado?.precio).replace(/[^\d.,]/g,'').replace(/\./g,'').replace(',','.')); const num = rf * selectedNumbers.length; return '$ ' + num.toLocaleString('es-AR') + '-'; } catch { return ''; }
                    })()}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center p-3 rounded-lg mb-4 bg-[#25F4EE]/10 border border-[#25F4EE]/30">
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

      {showImageViewer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95" onClick={() => setShowImageViewer(null)}>
          <button onClick={() => setShowImageViewer(null)} className="absolute top-4 right-4 text-white text-4xl z-10">✕</button>
          <img src={showImageViewer} alt="Imagen ampliada" className="max-w-full max-h-full object-contain p-4" onClick={e => e.stopPropagation()} />
          <div className="absolute bottom-8 text-white/60 text-sm">Tocá cualquier parte para cerrar</div>
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
          {toastMsg && (
        <div className="fixed top-4 right-4 bg-[#3483FA] text-white px-4 py-2 rounded shadow-lg animate-bounce">
          {toastMsg}
        </div>
      )}
        </div>
      </nav>
    </div>
  );
}
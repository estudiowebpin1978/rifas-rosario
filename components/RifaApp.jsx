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
  const [darkMode, setDarkMode] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userNombre, setUserNombre] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') setDarkMode(true);
    const savedUser = localStorage.getItem('rifaUser');
    if (savedUser) {
      const { email, nombre } = JSON.parse(savedUser);
      setUserEmail(email);
      setUserNombre(nombre);
    }
    if (!supabase) return;
    fetchCategorias();
    const sub = supabase.channel('cambios').on('postgres_changes', { event: '*', schema: 'public', table: 'boletos' }, () => {
      if (productoSeleccionado) fetchBoletos(productoSeleccionado.id);
    }).subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [categoriaActiva]);

  useEffect(() => {
    if (productoSeleccionado) fetchBoletos(productoSeleccionado.id);
  }, [productoSeleccionado]);

  const fetchCategorias = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('categorias').select('*').order('nombre');
    setCategorias(data || []);
    if (data?.length > 0 && !categoriaActiva) setCategoriaActiva(data[0].id);
  };

  const fetchProductos = async () => {
    if (!supabase) return;
    let query = supabase.from('productos').select('*, categorias(nombre)');
    if (categoriaActiva) query = query.eq('categoria_id', categoriaActiva);
    const { data } = await query;
    setProductos(data || []);
  };

  const fetchBoletos = async (productoId) => {
    if (!supabase) return;
    const { data } = await supabase.from('boletos').select('*').eq('producto_id', productoId).order('numero');
    setBoletos(data || []);
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
      nombre: nombre,
      whatsapp: whatsapp
    }).eq('numero', seleccionado).eq('producto_id', productoSeleccionado.id);

    if (!error) {
      confetti();
      const msg = `🎟️ *RESERVA DE NUMERO*\n\n`;
      const msg2 = `✅ Numero: *#${String(seleccionado).padStart(2,'0')}*\n`;
      const msg3 = `🎁 Producto: ${productoSeleccionado.nombre}\n`;
      const msg4 = `💰 Precio: ${productoSeleccionado.precio}\n\n`;
      const msg5 = `👤 Nombre: ${nombre}\n`;
      const msg6 = `📱 WhatsApp: ${whatsapp}\n\n`;
      const msg7 = `💳 *Alias de pago: .: rifas.rosario*\n\n`;
      const msg8 = `Enviame el comprobante de pago por este chat. Gracias! 🙏`;
      window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg+msg2+msg3+msg4+msg5+msg6+msg7+msg8)}`);
      setTimeout(() => {
        setSeleccionado(null);
        fetchBoletos(productoSeleccionado.id);
      }, 2000);
    }
    setLoading(false);
  };

  const guardarUsuario = (e) => {
    e.preventDefault();
    localStorage.setItem('rifaUser', JSON.stringify({ email: userEmail, nombre: userNombre }));
  };

  const shareApp = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: 'RIFA SMART', text: 'Participa en las mejores rifas!', url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  const vendidosCount = boletos.filter(b => b.estado === 'vendido').length;
  const porcentaje = boletos.length > 0 ? Math.round((vendidosCount / boletos.length) * 100) : 0;

  const theme = darkMode;

  return (
    <div className={`min-h-screen pb-24 ${theme ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <header className={`sticky top-0 z-40 px-4 py-3 ${theme ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-emerald-500">RIFA SMART</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${theme ? 'text-gray-400' : 'text-gray-400'}`}>
              {productoSeleccionado ? productoSeleccionado.nombre : 'Elegi tu premio'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setDarkMode(!darkMode); localStorage.setItem('darkMode', !darkMode); }} className={`p-2 rounded-full ${theme ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {theme ? '☀️' : '🌙'}
            </button>
            <button onClick={shareApp} className={`p-2 rounded-full ${theme ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {!productoSeleccionado ? (
        <main className="max-w-lg mx-auto p-4 space-y-4">
          <div className={`flex gap-2 overflow-x-auto pb-2 ${theme ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-2 shadow-sm`}>
            <button
              onClick={() => setCategoriaActiva(null)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${!categoriaActiva ? 'bg-emerald-500 text-white' : theme ? 'bg-gray-700 text-gray-300' : 'bg-gray-100'}`}
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${categoriaActiva === cat.id ? 'bg-emerald-500 text-white' : theme ? 'bg-gray-700 text-gray-300' : 'bg-gray-100'}`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {productos.map(prod => (
              <div
                key={prod.id}
                onClick={() => setProductoSeleccionado(prod)}
                className={`cursor-pointer rounded-2xl overflow-hidden shadow-lg transition-transform hover:scale-[1.02] ${theme ? 'bg-gray-800' : 'bg-white'}`}
              >
                <div className={`aspect-square ${theme ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center overflow-hidden`}>
                  {prod.imagen ? (
                    <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">🎁</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm mb-1 truncate">{prod.nombre}</h3>
                  <p className="text-emerald-500 font-black text-lg">{prod.precio}</p>
                  <p className={`text-xs mt-1 ${theme ? 'text-gray-400' : 'text-gray-500'}`}>
                    {prod.vendidos || 0}/100 vendidos
                  </p>
                </div>
              </div>
            ))}
          </div>

          {productos.length === 0 && (
            <div className={`text-center py-12 rounded-3xl ${theme ? 'bg-gray-800' : 'bg-white'}`}>
              <span className="text-6xl mb-4 block">🎰</span>
              <p className="font-bold text-lg">Pronto habra rifas!</p>
              <p className={`text-sm ${theme ? 'text-gray-400' : 'text-gray-500'}`}>Vuelve pronto para ver los premios</p>
            </div>
          )}
        </main>
      ) : (
        <main className="max-w-lg mx-auto p-4 space-y-4">
          <button onClick={() => { setProductoSeleccionado(null); setSeleccionado(null); }} className={`flex items-center gap-2 font-medium ${theme ? 'text-gray-300' : 'text-gray-600'}`}>
            ← Volver
          </button>

          <div className={`rounded-2xl overflow-hidden ${theme ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <div className={`aspect-video ${theme ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
              {productoSeleccionado.imagen ? (
                <img src={productoSeleccionado.imagen} alt={productoSeleccionado.nombre} className="w-full h-full object-contain" />
              ) : (
                <span className="text-7xl">🎁</span>
              )}
            </div>
            <div className="p-4">
              <h2 className="font-bold text-2xl">{productoSeleccionado.nombre}</h2>
              <p className="text-emerald-500 font-black text-3xl mt-1">{productoSeleccionado.precio}</p>
              <div className="mt-3 flex justify-between text-sm">
                <span className={theme ? 'text-gray-400' : 'text-gray-500'}>{vendidosCount}/100 vendidos</span>
                <span className="font-bold">{porcentaje}%</span>
              </div>
              <div className={`h-3 rounded-full mt-2 ${theme ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" style={{ width: `${porcentaje}%` }}></div>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-4 ${theme ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <p className={`text-xs font-bold uppercase mb-3 text-center ${theme ? 'text-gray-400' : 'text-gray-500'}`}>
              Elegi tu numero de la suerte
            </p>
            <div className="grid grid-cols-10 gap-1.5">
              {boletos.map(b => (
                <button
                  key={b.id}
                  disabled={b.estado === 'vendido'}
                  onClick={() => setSeleccionado(b.numero)}
                  className={`h-10 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95
                    ${b.estado === 'vendido' ? 'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-inner cursor-not-allowed' : 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300'}`}
                >
                  {String(b.numero).padStart(2, '0')}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs font-medium">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded"></span> Disponible</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded"></span> Vendido</span>
            </div>
          </div>

          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola! Quiero participar de la rifa: ${productoSeleccionado.nombre}`)}`}
            className="block w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-black py-4 rounded-2xl text-center shadow-lg shadow-green-500/30"
          >
            📱 CONTACTAR POR WHATSAPP
          </a>

          <div className={`rounded-2xl p-4 text-center ${theme ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
            <p className={`text-xs font-bold uppercase ${theme ? 'text-gray-400' : 'text-gray-500'}`}>Alias de Mercado Pago</p>
            <p className="text-2xl font-mono font-black text-emerald-500 mt-1">.: rifas.rosario</p>
          </div>
        </main>
      )}

      {seleccionado !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSeleccionado(null)}>
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${theme ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <p className={`text-sm font-bold uppercase ${theme ? 'text-gray-400' : 'text-gray-500'}`}>Numero reservado</p>
              <p className="text-6xl font-black text-emerald-500">#{String(seleccionado).padStart(2, '0')}</p>
            </div>

            <div className={`p-4 rounded-2xl mb-4 ${theme ? 'bg-gray-700' : 'bg-emerald-50'}`}>
              <p className="font-bold text-center">{productoSeleccionado?.nombre}</p>
              <p className="text-emerald-500 font-black text-xl text-center">{productoSeleccionado?.precio}</p>
            </div>

            <div className={`text-center p-4 rounded-2xl mb-4 ${theme ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-xs font-bold uppercase ${theme ? 'text-gray-400' : 'text-gray-500'}`}>Alias de Pago</p>
              <p className="text-xl font-mono font-black text-emerald-500">.: rifas.rosario</p>
            </div>

            <form onSubmit={handleReserva} className="space-y-3">
              <input name="nombre" placeholder="Tu nombre" required className={`w-full rounded-xl p-3.5 font-medium ${theme ? 'bg-gray-700 text-white' : 'bg-gray-100'}`} />
              <input name="whatsapp" placeholder="WhatsApp (Ej: 3416123456)" required className={`w-full rounded-xl p-3.5 font-medium ${theme ? 'bg-gray-700 text-white' : 'bg-gray-100'}`} />
              <button disabled={loading} className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-black py-4 rounded-xl shadow-lg disabled:opacity-50">
                {loading ? 'Reservando...' : 'ENVIAR POR WHATSAPP'}
              </button>
            </form>
            <button onClick={() => setSeleccionado(null)} className="w-full mt-3 text-gray-400 font-medium">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
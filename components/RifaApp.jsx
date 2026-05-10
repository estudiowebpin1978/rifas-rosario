'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import confetti from 'canvas-confetti';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function RifaApp() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { user, login, logout } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [boletos, setBoletos] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authData, setAuthData] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    fetchCategorias();
    const sub = supabase.channel('cambios').on('postgres_changes', { event: '*', schema: 'public', table: 'boletos' }, handleCambio).subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  useEffect(() => {
    fetchProductos();
    fetchComentarios();
  }, [categoriaActiva]);

  const fetchComentarios = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('comentarios').select('*').order('created_at', { ascending: false }).limit(10);
    setComentarios(data || []);
  };

  const handleCambio = async (payload) => {
    if (productoSeleccionado) fetchBoletos(productoSeleccionado.id);
    fetchProductos();
    fetchComentarios();
    
    if (payload.new?.estado === 'vendido' && user && payload.new?.numero) {
      showNotification(`Numero ${String(payload.new.numero).padStart(2,'0')} vendido!`);
    }
  };

  const showNotification = (msg) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('RIFA SMART', { body: msg });
    }
  };

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

  

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await login(authData.email, authData.password);
    if (error) setAuthError(error);
    else setShowAuth(false);
  };

  const handleReserva = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const form = e.target;
    const { error } = await supabase.from('boletos').update({
      estado: 'vendido',
      nombre: form.nombre.value,
      whatsapp: form.whatsapp.value
    }).eq('numero', seleccionado).eq('producto_id', productoSeleccionado.id);

    if (!error) {
      await supabase.from('comentarios').insert({
        nombre: form.nombre.value,
        mensaje: `compro el #${seleccionado} - ${productoSeleccionado.nombre}`
      });
      const msg = `Hola! Compre el #${seleccionado} - ${productoSeleccionado.nombre}. Mi nombre es ${form.nombre.value}.`;
      window.open(`https://wa.me/${productoSeleccionado.telefono || '5493410000000'}?text=${encodeURIComponent(msg)}`);
      setSeleccionado(null);
      fetchBoletos(productoSeleccionado.id);
    }
    setLoading(false);
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
  const total = boletos.length;
  const porcentaje = total > 0 ? Math.round((vendidosCount / total) * 100) : 0;

  return (
    <div className={`min-h-screen pb-20 font-sans transition-colors ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <header className={`sticky top-0 z-40 px-4 py-3 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-emerald-500">RIFA SMART</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>
              {productoSeleccionado ? productoSeleccionado.nombre : 'Elegi tu premio'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDarkMode} className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={shareApp} className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            {user ? (
              <a href="/admin" className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${darkMode ? 'bg-emerald-600' : 'bg-emerald-500'} text-white`}>
                <span className="text-xs font-bold">Admin</span>
              </a>
            ) : (
              <button onClick={() => setShowAuth(true)} className={`px-3 py-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} font-medium text-sm`}>
                Ingresar
              </button>
            )}
          </div>
        </div>
      </header>

      {!productoSeleccionado ? (
        <main className="max-w-2xl mx-auto p-4 space-y-4">
          <div className={`flex gap-2 overflow-x-auto pb-2 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-2 shadow-sm`}>
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  categoriaActiva === cat.id
                    ? 'bg-emerald-500 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {productos.map(prod => {
              return (
                <div
                  key={prod.id}
                  onClick={() => { setProductoSeleccionado(prod); fetchBoletos(prod.id); }}
                  className={`cursor-pointer rounded-2xl overflow-hidden shadow-lg transition-transform hover:scale-[1.02] ${
                    darkMode ? 'bg-gray-800' : 'bg-white'
                  }`}
                >
                  {prod.imagen && (
                    <div className="aspect-square bg-gray-200">
                      <img src={prod.imagen} alt={prod.nombre} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {!prod.imagen && (
                    <div className="aspect-square bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                      <span className="text-white text-4xl">🎁</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1">{prod.nombre}</h3>
                    <p className="text-emerald-500 font-black text-xl">{prod.precio}</p>
                    <button className="w-full mt-3 bg-emerald-500 text-white font-bold py-2 rounded-xl">VER NUMEROS</button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      ) : (
        <main className="max-w-2xl mx-auto p-4 space-y-4">
          <button onClick={() => setProductoSeleccionado(null)} className={`flex items-center gap-2 font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            ← Volver a productos
          </button>

          <div className={`rounded-2xl p-4 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center gap-4 mb-4">
              {productoSeleccionado.imagen && (
                <img src={productoSeleccionado.imagen} alt={productoSeleccionado.nombre} className="w-16 h-16 rounded-xl object-cover" />
              )}
              <div>
                <h2 className="font-bold text-xl">{productoSeleccionado.nombre}</h2>
                <p className="text-emerald-500 font-black text-2xl">{productoSeleccionado.precio}</p>
              </div>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Progreso de ventas</span>
              <span className="font-bold">{vendidosCount}/{total}</span>
            </div>
            <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all" style={{ width: `${porcentaje}%` }}></div>
            </div>
            {porcentaje === 100 && (
              <div className="mt-3 bg-emerald-500 text-white text-center py-2 rounded-xl font-bold animate-pulse">
                🎉 META ALCANZADA! 🎉
              </div>
            )}
          </div>

          <div className={`rounded-2xl p-4 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={`text-xs font-bold uppercase mb-3 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Selecciona tu numero de la suerte
            </p>
            <div className="grid grid-cols-10 gap-1.5">
              {boletos.map(b => (
                <button
                  key={b.id}
                  disabled={b.estado === 'vendido'}
                  onClick={() => setSeleccionado(b.numero)}
                  className={`
                    h-9 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95
                    ${b.estado === 'vendido'
                      ? 'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-inner cursor-not-allowed'
                      : 'bg-gradient-to-b from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-300'
                    }
                  `}
                >
                  {String(b.numero).padStart(2, '0')}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-4 text-xs font-medium">
              <span><span className="inline-block w-3 h-3 bg-emerald-400 rounded mr-1"></span>Disponible</span>
              <span><span className="inline-block w-3 h-3 bg-red-500 rounded mr-1"></span>Vendido</span>
            </div>
          </div>

          <div className={`rounded-2xl p-4 shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`text-xs font-bold uppercase mb-3 flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Ultimas compras
            </h3>
            {comentarios.length === 0 ? (
              <p className={`text-center py-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Sin actividad aun</p>
            ) : (
              comentarios.map((c, i) => (
                <div key={i} className={`flex items-center gap-3 py-2 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'} last:border-0`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    darkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {c.nombre?.[0]?.toUpperCase()}
                  </div>
                  <p className="text-sm flex-1">{c.mensaje}</p>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {seleccionado !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4" onClick={() => setSeleccionado(null)}>
          <div className={`w-full max-w-md rounded-t-3xl p-6 shadow-2xl animate-slide-up ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-black text-center">Confirmar compra</h2>
            <p className="text-5xl font-black text-emerald-500 text-center my-4">#{String(seleccionado).padStart(2, '0')}</p>
            
            <div className={`p-4 rounded-2xl mb-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <p className={`text-xs font-bold uppercase mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Producto</p>
              <p className="font-bold">{productoSeleccionado?.nombre}</p>
              <p className="text-emerald-500 font-black text-xl mt-1">{productoSeleccionado?.precio}</p>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Alias: .: rifas.rosario</p>
            </div>

            <form onSubmit={handleReserva} className="space-y-3">
              <input name="nombre" placeholder="Tu nombre completo" required className={`w-full rounded-xl p-3.5 font-medium ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`} />
              <input name="whatsapp" placeholder="WhatsApp (Ej: 3416123456)" required className={`w-full rounded-xl p-3.5 font-medium ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`} />
              <button disabled={loading} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {loading ? 'Procesando...' : 'COMPRAR NUMERO'}
              </button>
            </form>
            <button onClick={() => setSeleccionado(null)} className="w-full mt-3 text-gray-400 font-medium py-2">Cancelar</button>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAuth(false)}>
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-center mb-1">Panel Admin</h2>
            <p className={`text-sm text-center mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ingresa tus credenciales</p>
            {authError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{authError}</div>}
            <form onSubmit={handleLogin} className="space-y-3">
              <input type="email" placeholder="Email" required className={`w-full rounded-xl p-3.5 font-medium ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`} value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})} />
              <input type="password" placeholder="Contrasena" required className={`w-full rounded-xl p-3.5 font-medium ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`} value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} />
              <button className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl">INGRESAR</button>
            </form>
            <button onClick={() => setShowAuth(false)} className="w-full mt-4 text-gray-400 font-medium">Cerrar</button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
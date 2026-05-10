'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

export default function AdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [boletosData, setBoletosData] = useState({});
  const [activeTab, setActiveTab] = useState('productos');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', precio: '', imagen: '', categoria_id: '', telefono: '5493416971479' });
  const [showCatForm, setShowCatForm] = useState(false);
  const [catNombre, setCatNombre] = useState('');
  const [ganadorModal, setGanadorModal] = useState(null);
  const [notif, setNotif] = useState('');
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === null) setDarkMode(true);
    else setDarkMode(saved === 'true');
    
    if (isLoggedIn) {
      fetchData();
      if (!supabase) return;
      const sub = supabase.channel('ventas').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'boletos' }, (p) => {
        if (p.new.estado === 'vendido') {
          setNotif(`🔥 Nueva venta! #${String(p.new.numero).padStart(2,'0')} - ${p.new.nombre}`);
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('NUEVA VENTA', { body: `#${p.new.numero} - ${p.new.nombre}` });
          }
        }
      }).subscribe();
      return () => supabase.removeChannel(sub);
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    if (!supabase) return;
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categorias').select('*').order('nombre'),
      supabase.from('productos').select('*, categorias(nombre)').order('created_at', { ascending: false })
    ]);
    setCategorias(catRes.data || []);
    setProductos(prodRes.data || []);
    const bolRes = await supabase.from('boletos').select('*');
    const grouped = {};
    (bolRes.data || []).forEach(b => {
      if (!grouped[b.producto_id]) grouped[b.producto_id] = [];
      grouped[b.producto_id].push(b);
    });
    setBoletosData(grouped);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || data.user.email !== 'georchina348@gmail.com') {
      setError('Credenciales invalidas');
      await supabase.auth.signOut();
    } else {
      setIsLoggedIn(true);
      Notification.requestPermission();
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
  };

  const crearCategoria = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    await supabase.from('categorias').insert([{ nombre: catNombre }]);
    setCatNombre('');
    setShowCatForm(false);
    fetchData();
  };

  const crearProducto = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from('productos').insert([{ ...formData }]).select().single();
    if (!error && data) {
      for (let i = 0; i < 100; i++) {
        await supabase.from('boletos').insert([{ numero: i, producto_id: data.id, estado: 'disponible' }]);
      }
      setShowForm(false);
      setFormData({ nombre: '', precio: '', imagen: '', categoria_id: '', telefono: '5493416971479' });
      fetchData();
    }
    setLoading(false);
  };

  const eliminarProducto = async (id) => {
    if (!confirm('Eliminar este producto?')) return;
    if (!supabase) return;
    await supabase.from('boletos').delete().eq('producto_id', id);
    await supabase.from('productos').delete().eq('id', id);
    fetchData();
  };

  const sortear = async (producto) => {
    if (!supabase) return;
    const vendidos = (boletosData[producto.id] || []).filter(b => b.estado === 'vendido');
    if (vendidos.length < 100) {
      alert(`Necesitas vender los 100 numeros! (Vendidos: ${vendidos.length}/100)`);
      return;
    }
    const winner = vendidos[Math.floor(Math.random() * vendidos.length)];
    setGanadorModal({ producto, ...winner });
  };

  const confirmarGanador = async () => {
    if (!supabase || !ganadorModal) return;
    await supabase.from('productos').update({ finalizado: true, ganador_num: ganadorModal.numero, ganador_nombre: ganadorModal.nombre }).eq('id', ganadorModal.producto.id);
    confetti();
    setGanadorModal(null);
    fetchData();
  };

  const theme = darkMode;
  const totalVentas = Object.values(boletosData).flat().filter(b => b.estado === 'vendido').length;

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${theme ? 'bg-black' : 'bg-gray-100'}`}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
        </div>
        <form onSubmit={handleLogin} className={`relative z-10 w-full max-w-sm rounded-3xl p-6 shadow-2xl ${theme ? 'bg-gray-900 border border-white/10' : 'bg-white'}`}>
          <div className="text-center mb-6">
            <span className="text-6xl mb-4 block">🔐</span>
            <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">PANEL ADMIN</h1>
            <p className={`text-sm mt-1 ${theme ? 'text-gray-500' : 'text-gray-400'}`}>RIFAS ROSARIO</p>
          </div>
          {error && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-2xl text-sm mb-4">{error}</div>}
          <div className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className={`w-full rounded-2xl p-4 font-bold ${theme ? 'bg-white/10 border border-white/20' : 'bg-gray-100'}`} />
            <input type="password" placeholder="Contrasena" value={password} onChange={e => setPassword(e.target.value)} required className={`w-full rounded-2xl p-4 font-bold ${theme ? 'bg-white/10 border border-white/20' : 'bg-gray-100'}`} />
            <button disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-pink-500/30">
              {loading ? '⏳' : 'INGRESAR →'}
            </button>
          </div>
          <button type="button" onClick={() => router.push('/')} className={`w-full mt-4 text-sm ${theme ? 'text-gray-500' : 'text-gray-400'}`}>← Volver a la app</button>
        </form>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 ${theme ? 'bg-black text-white' : 'bg-white'}`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <header className={`sticky top-0 z-40 ${theme ? 'bg-black/90 backdrop-blur-xl border-b border-white/10' : 'bg-white/90 backdrop-blur-xl border-b'}`}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setDarkMode(!darkMode); localStorage.setItem('darkMode', !darkMode); }} className={`p-2 rounded-full ${theme ? 'bg-white/10' : 'bg-black/10'}`}>
                {theme ? '🌝' : '🌚'}
              </button>
              <div>
                <h1 className="text-lg font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">PANEL ADMIN</h1>
                <p className={`text-xs ${theme ? 'text-gray-500' : 'text-gray-400'}`}>{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/')} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg">Ver App 🎰</button>
              <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm">Salir</button>
            </div>
          </div>
        </div>
      </header>

      {notif && (
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-3 text-center font-black animate-bounce cursor-pointer" onClick={() => setNotif('')}>
          {notif} (toca para cerrar)
        </div>
      )}

      <main className="max-w-2xl mx-auto p-4 space-y-4 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-4 rounded-2xl text-center ${theme ? 'bg-gradient-to-b from-pink-500/20 to-purple-500/20 border border-pink-500/30' : 'bg-gradient-to-b from-pink-100 to-purple-100'}`}>
            <p className="text-3xl mb-1">🔥</p>
            <p className="text-2xl font-black text-pink-500">{totalVentas}</p>
            <p className={`text-xs ${theme ? 'text-gray-500' : 'text-gray-500'}`}>Ventas</p>
          </div>
          <div className={`p-4 rounded-2xl text-center ${theme ? 'bg-gradient-to-b from-cyan-500/20 to-blue-500/20 border border-cyan-500/30' : 'bg-gradient-to-b from-cyan-100 to-blue-100'}`}>
            <p className="text-3xl mb-1">🎁</p>
            <p className="text-2xl font-black text-cyan-500">{productos.length}</p>
            <p className={`text-xs ${theme ? 'text-gray-500' : 'text-gray-500'}`}>Productos</p>
          </div>
          <div className={`p-4 rounded-2xl text-center ${theme ? 'bg-gradient-to-b from-emerald-500/20 to-green-500/20 border border-emerald-500/30' : 'bg-gradient-to-b from-emerald-100 to-green-100'}`}>
            <p className="text-3xl mb-1">🏆</p>
            <p className="text-2xl font-black text-emerald-500">{productos.filter(p => p.finalizado).length}</p>
            <p className={`text-xs ${theme ? 'text-gray-500' : 'text-gray-500'}`}>Sorteados</p>
          </div>
        </div>

        <div className={`rounded-3xl overflow-hidden ${theme ? 'bg-white/5 border border-white/10' : 'bg-white shadow-xl'}`}>
          <div className="flex border-b border-white/10">
            {['productos', 'categorias'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-sm font-black capitalize transition-all ${activeTab === tab ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : theme ? 'text-gray-400' : 'text-gray-500'}`}>
                {tab === 'productos' ? '🎁 ' : '📂 '}{tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'productos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-black text-lg">Mis Productos</h2>
                  <button onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-2xl font-bold text-sm shadow-lg">
                    {showForm ? '✕ Cancelar' : '+ Nuevo'}
                  </button>
                </div>

                {showForm && (
                  <form onSubmit={crearProducto} className={`p-4 rounded-2xl space-y-3 ${theme ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <input placeholder="Nombre del producto" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className={`w-full rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-white'}`} />
                    <input placeholder="Precio (Ej: $5000)" required value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} className={`w-full rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-white'}`} />
                    <select required value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})} className={`w-full rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-white'}`}>
                      <option value="">Selecciona categoria</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <input placeholder="URL de imagen" value={formData.imagen} onChange={e => setFormData({...formData, imagen: e.target.value})} className={`w-full rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-white'}`} />
                    <button disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white py-3 rounded-xl font-black shadow-lg">{loading ? '⏳ Creando...' : 'CREAR PRODUCTO 🎁'}</button>
                  </form>
                )}

                <div className="space-y-3">
                  {productos.map(p => {
                    const vendidos = (boletosData[p.id] || []).filter(b => b.estado === 'vendido').length;
                    return (
                      <div key={p.id} className={`p-4 rounded-2xl ${theme ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className="flex gap-3">
                          {p.imagen && <img src={p.imagen} alt={p.nombre} className="w-16 h-16 rounded-xl object-cover" />}
                          <div className="flex-1">
                            <h3 className="font-bold">{p.nombre}</h3>
                            <p className="text-pink-500 font-black">{p.precio}</p>
                            <p className={`text-xs ${theme ? 'text-gray-500' : 'text-gray-400'}`}>{vendidos}/100 vendidos</p>
                          </div>
                          <button onClick={() => eliminarProducto(p.id)} className="bg-red-500 text-white px-3 py-1 rounded-xl text-sm font-bold h-fit">🗑️</button>
                        </div>
                        {vendidos >= 100 && !p.finalizado && (
                          <button onClick={() => sortear(p)} className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 rounded-xl font-black text-sm animate-bounce shadow-lg">
                            🎰 SORTEAR GANADOR
                          </button>
                        )}
                        {p.finalizado && (
                          <div className="mt-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-center py-2 rounded-xl font-black text-sm shadow-lg">
                            🏆 #{String(p.ganador_num).padStart(2,'0')} - {p.ganador_nombre}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'categorias' && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h2 className="font-bold">Categorias</h2>
                  <button onClick={() => setShowCatForm(!showCatForm)} className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-2xl font-bold text-sm">
                    {showCatForm ? '✕' : '+ Nueva'}
                  </button>
                </div>
                {showCatForm && (
                  <form onSubmit={crearCategoria} className="flex gap-2">
                    <input placeholder="Nombre" required value={catNombre} onChange={e => setCatNombre(e.target.value)} className={`flex-1 rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
                    <button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 rounded-xl font-bold">OK</button>
                  </form>
                )}
                <div className="flex flex-wrap gap-2">
                  {categorias.map(c => (
                    <span key={c.id} className={`px-4 py-2 rounded-full font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`}>{c.nombre}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {ganadorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setGanadorModal(null)}></div>
          <div className={`relative w-full max-w-sm rounded-3xl p-6 text-center ${theme ? 'bg-gray-900 border border-white/10' : 'bg-white'}`}>
            <div className="text-7xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">GANADOR!</h2>
            <p className="text-6xl font-black text-pink-500 my-4">#{String(ganadorModal.numero).padStart(2,'0')}</p>
            <p className="text-2xl font-black">{ganadorModal.nombre}</p>
            <p className={`text-sm mb-6 ${theme ? 'text-gray-500' : 'text-gray-400'}`}>{ganadorModal.whatsapp}</p>
            <div className="flex gap-3">
              <button onClick={() => setGanadorModal(null)} className="flex-1 py-3 rounded-2xl font-bold bg-gray-200">Cancelar</button>
              <button onClick={confirmarGanador} className="flex-1 py-3 rounded-2xl font-black bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg">Confirmar ✅</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
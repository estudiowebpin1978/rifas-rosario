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
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') setDarkMode(true);
    
    if (isLoggedIn) {
      fetchData();
      if (!supabase) return;
      const sub = supabase.channel('ventas').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'boletos' }, (p) => {
        if (p.new.estado === 'vendido') {
          setNotif(`Venta! #${String(p.new.numero).padStart(2,'0')} - ${p.new.nombre}`);
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
    if (authError || data.user.email !== 'georchina348@mail.com') {
      setError('Credenciales invalidas');
      if (supabase) await supabase.auth.signOut();
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
      setFormData({ nombre: '', precio: '', imagen: '', categoria_id: '', telefono: '5493410000000' });
      fetchData();
    }
    setLoading(false);
  };

  const eliminarProducto = async (id) => {
    if (!confirm('Eliminar?')) return;
    if (!supabase) return;
    await supabase.from('boletos').delete().eq('producto_id', id);
    await supabase.from('productos').delete().eq('id', id);
    fetchData();
  };

  const sortear = async (producto) => {
    if (!supabase) return;
    const vendidos = (boletosData[producto.id] || []).filter(b => b.estado === 'vendido');
    if (vendidos.length < 100) {
      alert(`Necesitas vender los 100 numeros (Vendidos: ${vendidos.length}/100)`);
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', !darkMode);
  };

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <form onSubmit={handleLogin} className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-emerald-500">PANEL ADMIN</h1>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ingresa tus credenciales</p>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{error}</div>}
          <div className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className={`w-full rounded-xl p-3.5 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`} />
            <input type="password" placeholder="Contrasena" value={password} onChange={e => setPassword(e.target.value)} required className={`w-full rounded-xl p-3.5 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`} />
            <button disabled={loading} className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl">{loading ? '...' : 'INGRESAR'}</button>
          </div>
          <button type="button" onClick={() => router.push('/')} className={`w-full mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ver App</button>
        </form>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      <header className={`sticky top-0 z-40 px-4 py-3 ${darkMode ? 'bg-gray-800' : 'bg-emerald-600'} text-white shadow-lg`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black">ADMIN</h1>
            <button onClick={toggleDarkMode} className="bg-white/20 p-2 rounded-full">{darkMode ? '☀️' : '🌙'}</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="bg-white/20 px-3 py-1.5 rounded text-sm">Ver App</button>
            <button onClick={handleLogout} className="bg-red-500 px-3 py-1.5 rounded text-sm font-bold">Salir</button>
          </div>
        </div>
      </header>

      {notif && (
        <div className="bg-emerald-500 text-white px-4 py-2 text-center font-bold animate-pulse cursor-pointer" onClick={() => setNotif('')}>
          {notif} (click para cerrar)
        </div>
      )}

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ventas</p>
            <p className="text-2xl font-black text-emerald-500">{Object.values(boletosData).flat().filter(b => b.estado === 'vendido').length}</p>
          </div>
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Productos</p>
            <p className="text-2xl font-black text-emerald-500">{productos.length}</p>
          </div>
          <div className={`p-4 rounded-2xl text-center ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Categorias</p>
            <p className="text-2xl font-black text-emerald-500">{categorias.length}</p>
          </div>
        </div>

        <div className={`rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow overflow-hidden`}>
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {['productos', 'categorias'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-sm font-bold capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'productos' && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h2 className="font-bold">Mis Productos</h2>
                  <button onClick={() => setShowForm(!showForm)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm">
                    {showForm ? 'Cancelar' : '+ Nuevo'}
                  </button>
                </div>

                {showForm && (
                  <form onSubmit={crearProducto} className={`p-4 rounded-xl space-y-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <input placeholder="Nombre del producto" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} />
                    <input placeholder="Precio (Ej: $5000)" required value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} />
                    <select required value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})} className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`}>
                      <option value="">Categoria</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <input placeholder="URL de imagen" value={formData.imagen} onChange={e => setFormData({...formData, imagen: e.target.value})} className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} />
                    <input placeholder="WhatsApp" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} />
                    <button disabled={loading} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold">{loading ? 'Creando...' : 'CREAR PRODUCTO'}</button>
                  </form>
                )}

                <div className="space-y-3">
                  {productos.map(p => {
                    const vendidos = (boletosData[p.id] || []).filter(b => b.estado === 'vendido').length;
                    return (
                      <div key={p.id} className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex gap-3">
                          {p.imagen && <img src={p.imagen} alt={p.nombre} className="w-16 h-16 rounded-xl object-cover" />}
                          <div className="flex-1">
                            <h3 className="font-bold">{p.nombre}</h3>
                            <p className="text-emerald-500 font-bold">{p.precio}</p>
                            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{vendidos}/100 vendidos</p>
                          </div>
                          <button onClick={() => eliminarProducto(p.id)} className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold h-fit">X</button>
                        </div>
                        {vendidos >= 100 && !p.finalizado && (
                          <button onClick={() => sortear(p)} className="w-full mt-2 bg-amber-500 text-white py-2 rounded-xl font-bold text-sm animate-pulse">
                            🎰 SORTEAR GANADOR
                          </button>
                        )}
                        {p.finalizado && (
                          <div className="mt-2 bg-emerald-500 text-white text-center py-2 rounded-xl font-bold text-sm">
                            🏆 #{p.ganador_num} - {p.ganador_nombre}
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
                  <button onClick={() => setShowCatForm(!showCatForm)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm">
                    {showCatForm ? 'Cancelar' : '+ Nueva'}
                  </button>
                </div>
                {showCatForm && (
                  <form onSubmit={crearCategoria} className="flex gap-2">
                    <input placeholder="Nombre" required value={catNombre} onChange={e => setCatNombre(e.target.value)} className={`flex-1 rounded-xl p-3 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`} />
                    <button className="bg-emerald-500 text-white px-6 rounded-xl font-bold">OK</button>
                  </form>
                )}
                <div className="flex flex-wrap gap-2">
                  {categorias.map(c => (
                    <span key={c.id} className={`px-4 py-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>{c.nombre}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {ganadorModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-6 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="text-6xl mb-2">🎉</div>
            <h2 className="text-2xl font-black">GANADOR!</h2>
            <p className="text-5xl font-black text-emerald-500 my-3">#{String(ganadorModal.numero).padStart(2,'0')}</p>
            <p className="text-xl font-bold">{ganadorModal.nombre}</p>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{ganadorModal.whatsapp}</p>
            <div className="flex gap-3">
              <button onClick={() => setGanadorModal(null)} className="flex-1 py-3 rounded-xl font-bold bg-gray-200">Cancelar</button>
              <button onClick={confirmarGanador} className="flex-1 py-3 rounded-xl font-bold bg-emerald-500 text-white">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
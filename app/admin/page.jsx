'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [boletos, setBoletos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [showFormProducto, setShowFormProducto] = useState(false);
  const [formProducto, setFormProducto] = useState({
    nombre: '', precio: '', descripcion: '', imagen: '', categoria_id: '', telefono: ''
  });
  const [formCategoria, setFormCategoria] = useState('');
  const [showFormCategoria, setShowFormCategoria] = useState(false);
  const [ganadorModal, setGanadorModal] = useState({ show: false, producto_id: null, producto: null });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetchData();
      const sub = supabase.channel('notifs').on('postgres_changes', { event: '*', schema: 'public', table: 'boletos' }, handleNewVenta).subscribe();
      return () => supabase.removeChannel(sub);
    }
  }, [user]);

  const handleNewVenta = (payload) => {
    if (payload.new?.estado === 'vendido') {
      setNotificaciones(prev => [{
        id: Date.now(),
        mensaje: `Nueva venta! Numero ${String(payload.new.numero).padStart(2,'0')} - ${payload.new.nombre}`,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('NUEVA VENTA!', { body: `Numero ${payload.new.numero} vendido a ${payload.new.nombre}` });
      }
    }
  };

  const fetchData = async () => {
    if (!supabase) return;
    const [catData, prodData, bolData] = await Promise.all([
      supabase.from('categorias').select('*').order('nombre'),
      supabase.from('productos').select('*, categorias(nombre)'),
      supabase.from('boletos').select('*').order('updated_at', { ascending: false }).limit(100)
    ]);
    setCategorias(catData.data || []);
    setProductos(prodData.data || []);
    setBoletos(bolData.data || []);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const crearCategoria = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.from('categorias').insert([{ nombre: formCategoria }]);
    if (!error) {
      setFormCategoria('');
      setShowFormCategoria(false);
      fetchData();
    }
    setLoading(false);
  };

  const crearProducto = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from('productos').insert([{ ...formProducto }]).select().single();
    if (!error && data) {
      for (let i = 0; i < 100; i++) {
        await supabase.from('boletos').insert([{ numero: i, producto_id: data.id, estado: 'disponible' }]);
      }
      setShowFormProducto(false);
      setFormProducto({ nombre: '', precio: '', descripcion: '', imagen: '', categoria_id: '', telefono: '' });
      fetchData();
    }
    setLoading(false);
  };

  const eliminarProducto = async (id) => {
    if (!confirm('Eliminar este producto y sus numeros?')) return;
    if (!supabase) return;
    await supabase.from('boletos').delete().eq('producto_id', id);
    await supabase.from('productos').delete().eq('id', id);
    fetchData();
  };

  const sortearGanador = async (producto) => {
    if (!supabase) return;
    const disponibles = producto.boletos?.filter(b => b.estado === 'vendido') || [];
    if (disponibles.length < 100) {
      alert('Necesitas vender los 100 numeros para sortear!');
      return;
    }
    const randomIndex = Math.floor(Math.random() * disponibles.length);
    const ganador = disponibles[randomIndex];
    setGanadorModal({ show: true, producto, numero: ganador.numero, nombre: ganador.nombre, whatsapp: ganador.whatsapp });
  };

  const confirmarGanador = async () => {
    if (!supabase || !ganadorModal.numero) return;
    const { error } = await supabase.from('productos').update({ finalizado: true }).eq('id', ganadorModal.producto.id);
    await supabase.from('productos').update({ ganador_num: ganadorModal.numero, ganador_nombre: ganadorModal.nombre }).eq('id', ganadorModal.producto.id);
    setGanadorModal({ show: false });
    fetchData();
  };

  const getProductosStats = () => {
    return productos.map(p => {
      const prodsBoletos = boletos.filter(b => b.producto_id === p.id);
      const vendidos = prodsBoletos.filter(b => b.estado === 'vendido').length;
      return { ...p, vendidos, total: 100, progreso: Math.round((vendidos / 100) * 100), boletos: prodsBoletos };
    });
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Cargando...</div>;
  }

  if (!user) {
    return null;
  }

  const stats = getProductosStats();
  const totalVentas = stats.reduce((acc, p) => acc + p.vendidos, 0);
  const metaCumplida = stats.filter(p => p.progreso === 100).length;

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      <header className={`sticky top-0 z-40 px-4 py-3 ${darkMode ? 'bg-gray-800' : 'bg-emerald-600'} text-white shadow-lg`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black">PANEL ADMIN</h1>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="bg-white/20 px-3 py-1.5 rounded text-sm font-medium hover:bg-white/30">
              Ver App
            </button>
            <button onClick={handleLogout} className="bg-red-500 px-3 py-1.5 rounded text-sm font-bold hover:bg-red-600">
              Salir
            </button>
          </div>
        </div>
      </header>

      {notificaciones.length > 0 && (
        <div className="bg-red-500 text-white px-4 py-2 text-center font-bold animate-pulse">
          {notificaciones[0].mensaje}
        </div>
      )}

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg text-center`}>
            <p className={`text-xs uppercase font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Ventas</p>
            <p className="text-3xl font-black text-emerald-500">{totalVentas}</p>
          </div>
          <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg text-center`}>
            <p className={`text-xs uppercase font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Productos</p>
            <p className="text-3xl font-black text-emerald-500">{productos.length}</p>
          </div>
          <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg text-center`}>
            <p className={`text-xs uppercase font-bold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Metas Cumplidas</p>
            <p className="text-3xl font-black text-emerald-500">{metaCumplida}</p>
          </div>
        </div>

        <div className={`rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg overflow-hidden`}>
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {['dashboard', 'productos', 'categorias'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-bold capitalize ${activeTab === tab ? 'bg-emerald-500 text-white' : darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'dashboard' && (
              <div className="space-y-3">
                <h2 className="font-bold text-lg">Resumen de Productos</h2>
                {stats.length === 0 ? (
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No hay productos aun</p>
                ) : (
                  stats.map(p => (
                    <div key={p.id} className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold">{p.nombre}</h3>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{p.categoria?.nombre}</p>
                        </div>
                        <span className="text-emerald-500 font-bold">{p.precio}</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{p.vendidos}/100 vendidos</span>
                        <span className="font-bold">{p.progreso}%</span>
                      </div>
                      <div className={`h-2 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                        <div className={`h-full rounded-full ${p.progreso === 100 ? 'bg-emerald-500' : 'bg-cyan-500'}`} style={{ width: `${p.progreso}%` }}></div>
                      </div>
                      {p.progreso === 100 && !p.finalizado && (
                        <button onClick={() => sortearGanador(p)} className="mt-2 w-full bg-emerald-500 text-white py-2 rounded-xl font-bold">
                          SORTEAR GANADOR
                        </button>
                      )}
                      {p.finalizado && (
                        <div className="mt-2 bg-emerald-500 text-white text-center py-2 rounded-xl font-bold">
                          Ganador: #{p.ganador_num} - {p.ganador_nombre}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'productos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">Productos</h2>
                  <button onClick={() => setShowFormProducto(!showFormProducto)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold">
                    + Nuevo Producto
                  </button>
                </div>

                {showFormProducto && (
                  <form onSubmit={crearProducto} className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} space-y-3`}>
                    <input placeholder="Nombre del producto" required className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} value={formProducto.nombre} onChange={e => setFormProducto({...formProducto, nombre: e.target.value})} />
                    <input placeholder="Precio (Ej: $5000)" required className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} value={formProducto.precio} onChange={e => setFormProducto({...formProducto, precio: e.target.value})} />
                    <select required className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} value={formProducto.categoria_id} onChange={e => setFormProducto({...formProducto, categoria_id: e.target.value})}>
                      <option value="">Selecciona categoria</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <input placeholder="URL de imagen" className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} value={formProducto.imagen} onChange={e => setFormProducto({...formProducto, imagen: e.target.value})} />
                    <input placeholder="Telefono WhatsApp (Ej: 5493416123456)" className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} value={formProducto.telefono} onChange={e => setFormProducto({...formProducto, telefono: e.target.value})} />
                    <textarea placeholder="Descripcion" className={`w-full rounded-xl p-3 ${darkMode ? 'bg-gray-600 text-white' : 'bg-white'}`} rows={2} value={formProducto.descripcion} onChange={e => setFormProducto({...formProducto, descripcion: e.target.value})} />
                    <button disabled={loading} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold">{loading ? 'Creando...' : 'CREAR PRODUCTO'}</button>
                  </form>
                )}

                <div className="space-y-3">
                  {productos.map(p => (
                    <div key={p.id} className={`p-4 rounded-xl flex gap-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      {p.imagen && <img src={p.imagen} alt={p.nombre} className="w-20 h-20 rounded-xl object-cover" />}
                      <div className="flex-1">
                        <h3 className="font-bold">{p.nombre}</h3>
                        <p className="text-emerald-500 font-bold">{p.precio}</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{p.categoria?.nombre}</p>
                      </div>
                      <button onClick={() => eliminarProducto(p.id)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold self-start">Eliminar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'categorias' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-bold text-lg">Categorias</h2>
                  <button onClick={() => setShowFormCategoria(!showFormCategoria)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold">
                    + Nueva Categoria
                  </button>
                </div>
                {showFormCategoria && (
                  <form onSubmit={crearCategoria} className="flex gap-2">
                    <input placeholder="Nombre de categoria" required className={`flex-1 rounded-xl p-3 ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'}`} value={formCategoria} onChange={e => setFormCategoria(e.target.value)} />
                    <button disabled={loading} className="bg-emerald-500 text-white px-6 rounded-xl font-bold">{loading ? 'OK' : 'Agregar'}</button>
                  </form>
                )}
                <div className="flex flex-wrap gap-2">
                  {categorias.map(c => (
                    <span key={c.id} className={`px-4 py-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} font-medium`}>{c.nombre}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {ganadorModal.show && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-3xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} text-center`}>
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-black mb-2">GANADOR!</h2>
            <p className="text-6xl font-black text-emerald-500 mb-2">#{String(ganadorModal.numero).padStart(2, '0')}</p>
            <p className="text-2xl font-bold mb-4">{ganadorModal.nombre}</p>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{ganadorModal.whatsapp}</p>
            <div className="flex gap-3">
              <button onClick={() => setGanadorModal({ show: false })} className="flex-1 py-3 rounded-xl font-bold bg-gray-200">Cancelar</button>
              <button onClick={confirmarGanador} className="flex-1 py-3 rounded-xl font-bold bg-emerald-500 text-white">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import LogoImg from '../../public/logo.png';
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
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', precio: '', imagen: '', categoria_id: '', telefono: '5493416971479', descripcion: '' });
  const [notif, setNotif] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef(null);
  const theme = true;

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      if (supabase) {
        try {
          const sub = supabase.channel('admin_ventas').on('postgres_changes', { event: '*', schema: 'public', table: 'boletos' }, () => {
            fetchData();
          }).on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => {
            fetchData();
          }).subscribe();
          return () => supabase.removeChannel(sub);
        } catch (e) {
          console.log('Realtime no disponible, usando polling');
          const interval = setInterval(fetchData, 5000);
          return () => clearInterval(interval);
        }
      }
    }
  }, [isLoggedIn, refreshKey]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/productos?_=' + Date.now());
      const result = await res.json();
      if (result.productos) setProductos(result.productos);
      if (result.categorias) setCategorias(result.categorias);
      if (result.boletos) {
        const grouped = {};
        result.boletos.forEach(b => {
          if (!grouped[b.producto_id]) grouped[b.producto_id] = [];
          grouped[b.producto_id].push(b);
        });
        setBoletosData(grouped);
      }
    } catch (err) {
      console.error('Error:', err);
    }
    setLoading(false);
  };

  const manualRefresh = () => {
    setRefreshKey(k => k + 1);
    fetchData();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!supabase) { setError('Servicio no disponible'); setLoading(false); return; }
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.user || data.user.email !== 'georchina348@gmail.com') {
        setError('Credenciales invalidas');
        if (data?.user) await supabase.auth.signOut();
      } else {
        setIsLoggedIn(true);
      }
    } catch (err) {
      setError('Error al iniciar sesion');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const uploadFormData = new FormData();
    uploadFormData.append('image', file);
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: uploadFormData });
      const data = await res.json();
      if (data.url) setFormData({...formData, imagen: data.url});
    } catch (err) { console.error('Upload error:', err); }
    setUploadingImage(false);
  };

  const crearProducto = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!formData.nombre || !formData.precio || !formData.categoria_id) {
      alert('Completá todos los campos');
      setLoading(false);
      return;
    }
    const productoData = {
      nombre: formData.nombre,
      precio: formData.precio,
      imagen: formData.imagen || null,
      descripcion: formData.descripcion || null,
      categoria_id: parseInt(formData.categoria_id),
      telefono: '5493416971479'
    };
    try {
      const res = await fetch('/api/crear-producto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoData)
      });
      const result = await res.json();
      if (!res.ok) alert('Error: ' + result.error);
      else {
        setShowForm(false);
        setFormData({ nombre: '', precio: '', imagen: '', categoria_id: '', telefono: '5493416971479' });
        setTimeout(() => { fetchData(); alert('Producto creado!'); }, 500);
      }
    } catch (err) { alert('Error al crear'); }
    setLoading(false);
  };

  const eliminarProducto = async (id, nombre) => {
    if (!confirm(`Eliminar "${nombre}"?\n\nEsto eliminará el producto y sus 100 números.`)) return;
    try {
      const res = await fetch(`/api/productos?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert('Error al eliminar');
    } catch (err) { alert('Error'); }
  };

  const confirmarVenta = async (boleto) => {
    if (!supabase) return;
    await supabase.from('boletos').update({ estado: 'vendido' }).eq('id', boleto.id);
    confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
    setNotif(`✅ Venta confirmada! #${String(boleto.numero).padStart(2,'0')} - ${boleto.nombre}`);
    setShowConfirmModal(null);
    fetchData();
    const msg = `✅ VENTA CONFIRMADA - RIFAS ROSARIO\n\n#${String(boleto.numero).padStart(2,'0')} - ${boleto.nombre}\n\nTus numeros están asegurados!\nEl sorteo se realizará cuando se vendan los 100.`;
    if (boleto.whatsapp) {
      window.open('https://wa.me/' + boleto.whatsapp + '?text=' + encodeURIComponent(msg), '_blank');
    }
  };

  const cancelarReserva = async (boleto) => {
    if (!supabase) return;
    if (!confirm(`Cancelar reserva #${boleto.numero}?\n\nEl número volverá a estar disponible.`)) return;
    await supabase.from('boletos').update({ estado: 'disponible', nombre: null, whatsapp: null }).eq('id', boleto.id);
    setNotif(`❌ Reserva cancelada #${boleto.numero}`);
    fetchData();
  };

  const todosBoletos = Object.values(boletosData).flat();
  const pendientesPago = todosBoletos.filter(b => b.estado === 'reservado');
  const vendidosCount = todosBoletos.filter(b => b.estado === 'vendido').length;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
        </div>
        <form onSubmit={handleLogin} className="relative z-10 w-full max-w-sm rounded-3xl p-6 shadow-2xl bg-gray-900 border border-white/10">
          <div className="text-center mb-6">
            <Image src={LogoImg} alt="logo" width={64} height={64} className="object-cover mx-auto mb-4 rounded-xl" />
            <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">PANEL ADMIN</h1>
          </div>
          {error && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-2xl text-sm mb-4">{error}</div>}
          <div className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full rounded-2xl p-4 font-bold bg-white/10 border border-white/20" />
            <input type="password" placeholder="Contrasena" value={password} onChange={e => setPassword(e.target.value)} required className="w-full rounded-2xl p-4 font-bold bg-white/10 border border-white/20" />
            <button disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black py-4 rounded-2xl shadow-lg">
              {loading ? '⏳' : 'INGRESAR →'}
            </button>
          </div>
          <button type="button" onClick={() => router.push('/')} className="w-full mt-4 text-sm text-gray-500">← Volver</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-black text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src={LogoImg} alt="logo" width={40} height={40} className="object-contain rounded-lg" />
            <div>
              <h1 className="text-lg font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">ADMIN</h1>
              <p className="text-xs text-gray-500">{email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-full font-bold text-sm">Ver App 🎰</button>
            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm">Salir</button>
            <button onClick={manualRefresh} className="bg-cyan-500 text-white px-4 py-2 rounded-full font-bold text-sm">🔄 Actualizar</button>
          </div>
        </div>
      </header>

      {notif && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 text-center font-black animate-bounce cursor-pointer" onClick={() => setNotif('')}>
          {notif} (toca para cerrar)
        </div>
      )}

      <main className="max-w-2xl mx-auto p-4 space-y-4 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl text-center bg-gradient-to-b from-pink-500/20 to-purple-500/20 border border-pink-500/30">
            <p className="text-3xl mb-1">📬</p>
            <p className="text-2xl font-black text-pink-500">{pendientesPago.length}</p>
            <p className="text-xs text-gray-500">Pendientes</p>
          </div>
          <div className="p-4 rounded-2xl text-center bg-gradient-to-b from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
            <p className="text-3xl mb-1">✅</p>
            <p className="text-2xl font-black text-emerald-500">{vendidosCount}</p>
            <p className="text-xs text-gray-500">Vendidos</p>
          </div>
          <div className="p-4 rounded-2xl text-center bg-gradient-to-b from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
            <p className="text-3xl mb-1">🎁</p>
            <p className="text-2xl font-black text-cyan-500">{productos.length}</p>
            <p className="text-xs text-gray-500">Rifas</p>
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-b from-orange-500/20 to-yellow-500/20 border-2 border-orange-500/50 p-4">
          <h2 className="font-black text-lg mb-3 flex items-center gap-2">📬 BANDEJA DE ENTRADA - PAGOS PENDIENTES</h2>
          {pendientesPago.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-5xl mb-3 block">📭</span>
              <p className="font-bold">No hay pagos pendientes</p>
              <p className="text-sm mt-1">Los pagos aparecerán aquí cuando alguien reserve un número</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendientesPago.map(b => {
                const producto = productos.find(p => p.id === b.producto_id);
                return (
                  <div key={b.id} className="bg-black/50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl font-black text-yellow-400">#{String(b.numero).padStart(2,'0')}</span>
                      <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-bold">⏳ 10 min</span>
                    </div>
                    <p className="font-bold text-lg">{b.nombre || 'Sin nombre'}</p>
                    <p className="text-gray-400 text-sm">{b.whatsapp}</p>
                    <p className="text-pink-500 font-black mt-1">{producto?.nombre} - {producto?.precio}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setShowConfirmModal(b)} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-black text-sm shadow-lg">
                        ✅ CONFIRMAR PAGO
                      </button>
                      <button onClick={() => cancelarReserva(b)} className="bg-red-500 text-white px-4 py-3 rounded-xl font-bold text-sm">
                        ❌ Cancelar
                      </button>
                      {b.whatsapp && (
                        <button onClick={() => window.open('https://wa.me/' + b.whatsapp, '_blank')} className="bg-green-600 text-white px-4 py-3 rounded-xl font-bold text-sm">
                          📱
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black">🎁 MIS RIFAS</h2>
            <button onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-2xl font-bold text-sm">
              {showForm ? '✕ Cancelar' : '+ Nueva Rifa'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={crearProducto} className="p-4 rounded-2xl bg-white/5 space-y-3 mb-4">
              <input placeholder="Nombre del producto" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white/10" />
              <input placeholder="Precio (Ej: $3500- pesos)" required value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white/10" />
              <textarea placeholder="Descripcion (opcional)" value={formData.descripcion || ''} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white/10" rows="2" />
              <select required value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white/10">
                <option value="">Selecciona categoria</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              
              <div>
                <label className="text-sm font-bold block mb-2">Imagen del producto</label>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-3 rounded-xl font-bold">
                  {uploadingImage ? '⏳ Subiendo...' : '📷 Subir imagen'}
                </button>
                {formData.imagen && (
                  <div className="relative mt-2">
                    <img src={formData.imagen} alt="preview" className="w-full h-40 object-cover rounded-xl" />
                    <button type="button" onClick={() => setFormData({...formData, imagen: ''})} className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full">✕</button>
                  </div>
                )}
              </div>

              <button disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white py-3 rounded-xl font-black shadow-lg">
                {loading ? '⏳ Creando...' : 'CREAR RIFA 🎁'}
              </button>
            </form>
          )}

          <div className="space-y-3">
            {productos.map(p => {
              const vend = (boletosData[p.id] || []).filter(b => b.estado === 'vendido').length;
              const res = (boletosData[p.id] || []).filter(b => b.estado === 'reservado').length;
              const porcent = Math.round((vend / 100) * 100);
              return (
                <div key={p.id} className={`p-4 rounded-2xl bg-white/5 ${p.finalizado ? 'opacity-60 border border-yellow-500/30' : ''}`}>
                  <div className="flex gap-3">
                    {p.imagen && <img src={p.imagen} alt={p.nombre} className="w-16 h-16 object-cover rounded-xl" />}
                    <div className="flex-1">
                      <h3 className="font-bold">{p.nombre}</h3>
                      <p className="text-pink-500 font-black">{p.precio}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-emerald-400 font-bold">✅ {vend}/100</span>
                        {res > 0 && <span className="text-orange-400 font-bold">⏳ {res} reservados</span>}
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${vend >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-500 to-cyan-500'}`} style={{ width: porcent + '%' }}></div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => eliminarProducto(p.id, p.nombre)} className="bg-red-500 text-white px-3 py-2 rounded-xl font-bold self-start">🗑️</button>
                  </div>
                  {vend >= 100 && !p.finalizado && (
                    <div className="mt-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-center py-2 rounded-xl font-black text-sm shadow-lg animate-pulse">
                      🎉 TODOS VENDIDOS - ESPERANDO SORTEO AUTOMATICO
                    </div>
                  )}
                  {p.finalizado && (
                    <div className="mt-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center py-2 rounded-xl font-black text-sm shadow-lg">
                      🏆 GANADOR: #{String(p.ganador_num).padStart(2,'0')} - {p.ganador_nombre}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl bg-gradient-to-b from-blue-500/20 to-purple-500/20 border border-blue-500/30 p-4">
          <h2 className="font-black text-lg mb-3">📋 COMO FUNCIONA</h2>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 items-start">
              <span className="text-2xl">1️⃣</span>
              <div>
                <p className="font-bold">Crear Rifas</p>
                <p className="text-gray-400">Usa el botón "+ Nueva Rifa" para crear productos. Se crean 100 números automáticamente.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-2xl">2️⃣</span>
              <div>
                <p className="font-bold">Recibir Reservas</p>
                <p className="text-gray-400">Cuando alguien elige números y paga, aparecen en la "Bandeja de Entrada" arriba.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-2xl">3️⃣</span>
              <div>
                <p className="font-bold">Confirmar Pagos</p>
                <p className="text-gray-400">Click en "✅ CONFIRMAR PAGO" para marcar como vendido. Click en WhatsApp para contactarte.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className="text-2xl">4️⃣</span>
              <div>
                <p className="font-bold">Sorteo Automatico</p>
                <p className="text-gray-400">Cuando se venden los 100 números, el sistema sortea automáticamente y notifica a todos por WhatsApp.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowConfirmModal(null)}></div>
          <div className="relative w-full max-w-sm rounded-3xl p-6 text-center bg-gray-900 border border-white/10">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-black">CONFIRMAR PAGO</h2>
            <p className="text-5xl font-black text-yellow-400 my-4">#{String(showConfirmModal.numero).padStart(2,'0')}</p>
            <p className="text-xl font-bold">{showConfirmModal.nombre}</p>
            <p className="text-gray-400 mb-6">{showConfirmModal.whatsapp}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(null)} className="flex-1 py-3 rounded-2xl font-bold bg-gray-700">Cancelar</button>
              <button onClick={() => confirmarVenta(showConfirmModal)} className="flex-1 py-3 rounded-2xl font-black bg-green-500 text-white shadow-lg">Confirmar ✅</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
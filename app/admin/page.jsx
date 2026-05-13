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
  const [activeTab, setActiveTab] = useState('productos');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', precio: '', imagen: '', categoria_id: '', telefono: '5493416971479', descripcion: '' });
  const [showCatForm, setShowCatForm] = useState(false);
  const [catNombre, setCatNombre] = useState('');
  const [ganadorModal, setGanadorModal] = useState(null);
  const [notif, setNotif] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const theme = true;
  const [uploadingImage, setUploadingImage] = useState(false);
  const [reels, setReels] = useState([]);
  const [showReelForm, setShowReelForm] = useState(false);
  const [reelData, setReelData] = useState({ titulo: '', video_url: '', thumbnail_url: '' });
  const fileInputRef = useRef(null);
  const reelInputRef = useRef(null);

  const sortearTodos = async (producto) => {
    if (!supabase) return;
    if (!confirm('Esto va a marcar TODOS los 100 numeros como vendidos y sortear. Continuar?')) return;
    
    const todosBoletos = boletosData[producto.id] || [];
    for (const b of todosBoletos) {
      await supabase.from('boletos').update({ estado: 'vendido', nombre: 'TEST-' + b.numero, whatsapp: '54999999999' }).eq('id', b.id);
    }
    
    const res = await fetch('/api/productos');
    const data = await res.json();
    const updated = data.boletos.filter(b => b.producto_id === producto.id && b.estado === 'vendido');
    if (updated.length < 100) return;
    
    const winner = updated[Math.floor(Math.random() * updated.length)];
    await supabase.from('productos').update({
      finalizado: true,
      winner_num: winner.numero,
      winner_nombre: winner.nombre
    }).eq('id', producto.id);
    
    confetti({ particleCount: 300, spread: 360, origin: { y: 0.6 } });
    alert('Sorteo SIMULADO! Ganador: #' + String(winner.numero).padStart(2,'0') + ' - ' + winner.nombre);
    fetchData();
  };

  const LOGO_URL = '/logo.png';
  const WHATSAPP = '5493416971479';

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === null) setDarkMode(true);
    else setDarkMode(saved === 'true');
    
    if (isLoggedIn) {
      fetchData();
      if (supabase) {
        try {
          const sub = supabase.channel('ventas').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'boletos' }, (p) => {
            if (p.new.estado === 'vendido') {
              setNotif(`🔥 Nueva venta! #${String(p.new.numero).padStart(2,'0')} - ${p.new.nombre}`);
              sendWhatsAppNotification(`NUEVA VENTA! Numero #${String(p.new.numero).padStart(2,'0')} - ${p.new.nombre}`);
            }
          }).subscribe();
          return () => supabase.removeChannel(sub);
        } catch (e) {
          console.log('Realtime no disponible');
        }
      }
    }
  }, [isLoggedIn]);

  const sendWhatsAppNotification = (message) => {
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const fetchData = async () => {
    setLoading(true);
    
    try {
      const res = await fetch('/api/productos');
      const result = await res.json();
      console.log('API result:', result);
      
      if (result.productos) {
        setProductos(result.productos);
      }
      
      if (result.categorias) {
        setCategorias(result.categorias);
      }
      
      if (result.boletos) {
        const grouped = {};
        result.boletos.forEach(b => {
          if (!grouped[b.producto_id]) grouped[b.producto_id] = [];
          grouped[b.producto_id].push(b);
        });
        setBoletosData(grouped);
      }
    } catch (err) {
      console.error('Error fetching productos:', err);
    }
    
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!supabase) {
        setError('Servicio no disponible');
        setLoading(false);
        return;
      }
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.user || data.user.email !== 'georchina348@gmail.com') {
        setError('Credenciales invalidas');
        if (data?.user) await supabase.auth.signOut();
      } else {
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error('Login error:', err);
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
      if (data.url) {
        setFormData({...formData, imagen: data.url});
      } else if (data.error) {
        alert('Error al subir imagen: ' + data.error);
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error al subir imagen');
    }
    setUploadingImage(false);
  };

  const crearCategoria = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    await supabase.from('categorias').insert([{ nombre: catNombre }]);
    setCatNombre('');
    setShowCatForm(false);
    fetchData();
  };

  const crearReel = async (e) => {
    e.preventDefault();
    if (!reelData.titulo) {
      alert('Ingresá un título para el reel');
      return;
    }
    try {
      const res = await fetch('/api/reels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reelData)
      });
      const data = await res.json();
      if (data.success) {
        setReels([data.reel, ...reels]);
        setReelData({ titulo: '', video_url: '', thumbnail_url: '' });
        setShowReelForm(false);
        alert('Reel creado!');
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleReelThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) setReelData({ ...reelData, thumbnail_url: data.url });
    } catch (err) {
      console.error('Error:', err);
    }
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
    
    console.log('Enviando:', productoData);
    
    try {
      const res = await fetch('/api/crear-producto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoData)
      });
      
      const result = await res.json();
      console.log('Respuesta API:', result);
      
      if (!res.ok) {
        alert('Error: ' + result.error);
      } else {
        console.log('Producto creado OK:', result.producto);
        setShowForm(false);
        setFormData({ nombre: '', precio: '', imagen: '', categoria_id: '', telefono: '5493416971479' });
        setTimeout(() => {
          fetchData();
          alert('Producto creado exitosamente!');
        }, 1000);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error al crear producto');
    }
    setLoading(false);
  };

  const eliminarProducto = async (id, nombre) => {
    if (!confirm(`Eliminar "${nombre}"?\n\nEsto eliminará el producto y sus 100 números.`)) return;
    try {
      const res = await fetch(`/api/productos?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert('Error al eliminar');
    } catch (err) {
      console.error('Error:', err);
      alert('Error al eliminar');
    }
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
    sendWhatsAppNotification(`🎉 SORTEANDO! Producto: ${producto.nombre}`);
  };

  const confirmarGanador = async () => {
    if (!supabase || !ganadorModal) return;
    await supabase.from('productos').update({ 
      finalizado: true, 
      ganador_num: ganadorModal.numero, 
      ganador_nombre: ganadorModal.nombre 
    }).eq('id', ganadorModal.producto.id);
    confetti();
    sendWhatsAppNotification(`🏆 GANADOR CONFIRMADO!\nProducto: ${ganadorModal.producto.nombre}\nNumero: #${String(ganadorModal.numero).padStart(2,'0')}\nGanador: ${ganadorModal.nombre}`);
    setGanadorModal(null);
    fetchData();
  };

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
            <Image src={LogoImg} alt="logo" width={64} height={64} className="object-cover mx-auto mb-4 rounded-xl" />
            <h1 className="text-2xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">PANEL ADMIN</h1>
          </div>
          {error && <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded-2xl text-sm mb-4">{error}</div>}
          <div className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className={`w-full rounded-2xl p-4 font-bold ${theme ? 'bg-white/10 border border-white/20' : 'bg-gray-100'}`} />
            <input type="password" placeholder="Contrasena" value={password} onChange={e => setPassword(e.target.value)} required className={`w-full rounded-2xl p-4 font-bold ${theme ? 'bg-white/10 border border-white/20' : 'bg-gray-100'}`} />
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
    <div className={`min-h-screen pb-20 ${theme ? 'bg-black text-white' : 'bg-white'}`}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <header className={`sticky top-0 z-40 ${theme ? 'bg-black/90 backdrop-blur-xl border-b border-white/10' : 'bg-white/90 backdrop-blur-xl border-b'}`}>
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">PANEL ADMIN</h1>
                <p className="text-xs text-gray-500">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push('/')} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-full font-bold text-sm">Ver App 🎰</button>
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
            {['productos', 'categorias', 'reels'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-sm font-black capitalize ${activeTab === tab ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : theme ? 'text-gray-400' : 'text-gray-500'}`}>
                {tab === 'productos' ? '🎁 ' : tab === 'categorias' ? '📂 ' : '🎬 '}{tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 'productos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="font-black">Mis Productos</h2>
                  <div className="flex gap-2">
                    {productos.filter(p => p.finalizado).length > 0 && (
                      <button onClick={() => {
                        if (!confirm(`Eliminar ${productos.filter(p => p.finalizado).length} productos finalizados?`)) return;
                        productos.filter(p => p.finalizado).forEach(p => eliminarProducto(p.id, p.nombre));
                      }} className="bg-orange-500 text-white px-3 py-2 rounded-2xl font-bold text-xs">
                        🧹 Limpiar finalizados
                      </button>
                    )}
                    <button onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-2xl font-bold text-sm">
                      {showForm ? '✕ Cancelar' : '+ Nuevo'}
                    </button>
                  </div>
                </div>

                {showForm && (
                  <form onSubmit={crearProducto} className={`p-4 rounded-2xl space-y-3 ${theme ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <input placeholder="Nombre del producto" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className={`w-full rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-white'}`} />
                    <input placeholder="Precio (Ej: $3500- pesos)" required value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} className={`w-full rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-white'}`} />
                    <textarea placeholder="Descripcion del producto (opcional)" value={formData.descripcion || ''} onChange={e => setFormData({...formData, descripcion: e.target.value})} className={`w-full rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-white'}`} rows="2" />
                    <select required value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})} className={`w-full rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-white'}`}>
                      <option value="">Selecciona categoria</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-bold">Imagen del producto</label>
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-3 rounded-xl font-bold">
                        {uploadingImage ? '⏳ Subiendo...' : '📷 Subir desde dispositivo'}
                      </button>
                      {formData.imagen && (
                        <div className="relative">
                          <Image src={formData.imagen} alt="preview" width={400} height={160} className="object-cover rounded-xl" />
                          <button type="button" onClick={() => setFormData({...formData, imagen: ''})} className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full">✕</button>
                        </div>
                      )}
                    </div>

                    <button disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white py-3 rounded-xl font-black shadow-lg">{loading ? '⏳ Creando...' : 'CREAR PRODUCTO 🎁'}</button>
                  </form>
                )}

                {productos.length > 0 && (
                  <div className={`p-4 rounded-2xl ${theme ? 'bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'}`}>
                    <h3 className="font-black text-sm mb-3 flex items-center gap-2">
                      <span>🔄</span> DUPLICADOS / ERRORES
                    </h3>
                    {(() => {
                      const counts = {};
                      productos.forEach(p => {
                        const key = p.nombre.toLowerCase();
                        counts[key] = counts[key] || [];
                        counts[key].push(p);
                      });
                      const duplicados = Object.values(counts).filter(arr => arr.length > 1);
                      return duplicados.length > 0 ? (
                        <div className="space-y-2">
                          {duplicados.map(arr => (
                            <div key={arr[0].id} className={`p-2 rounded-xl ${theme ? 'bg-white/5' : 'bg-white'}`}>
                              <p className="font-bold text-sm">{arr[0].nombre}</p>
                              <p className="text-xs text-gray-500 mb-2">{arr.length} productos duplicados</p>
                              <div className="flex gap-2">
                                {arr.map(p => (
                                  <button key={p.id} onClick={() => eliminarProducto(p.id, p.nombre)} className="bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
                                    🗑️ #{p.id}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No hay duplicados</p>
                      );
                    })()}
                  </div>
                )}

                {productos.length > 0 && (
                  <div className={`p-4 rounded-2xl ${theme ? 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <h3 className="font-black text-sm mb-3 flex items-center gap-2">
                      <span>🔥</span> ULTIMOS / MAS DISPONIBLES
                    </h3>
                    <div className="space-y-2">
                      {[...productos]
                        .filter(p => !p.finalizado)
                        .sort((a, b) => {
                          const aVend = (boletosData[a.id] || []).filter(bv => bv.estado === 'vendido').length;
                          const bVend = (boletosData[b.id] || []).filter(bv => bv.estado === 'vendido').length;
                          return aVend - bVend;
                        })
                        .slice(0, 5)
                        .map(p => {
                          const vend = (boletosData[p.id] || []).filter(bv => bv.estado === 'vendido').length;
                          return (
                            <div key={p.id} className={`flex items-center gap-3 p-2 rounded-xl ${theme ? 'bg-white/5' : 'bg-white'}`}>
                              <span className="text-2xl">{p.imagen ? '📦' : '🎁'}</span>
                              <div className="flex-1">
                                <p className="font-bold text-sm">{p.nombre}</p>
                                <p className="text-xs text-gray-500">{p.precio}</p>
                              </div>
                              <div className="text-right">
                                <p className={`font-black text-lg ${vend === 0 ? 'text-emerald-500' : vend < 50 ? 'text-yellow-500' : 'text-pink-500'}`}>{100 - vend}</p>
                                <p className="text-xs text-gray-500">libres</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {productos.map(p => {
                    const vendidos = (boletosData[p.id] || []).filter(b => b.estado === 'vendido').length;
                    return (
                      <div key={p.id} className={`p-4 rounded-2xl ${p.finalizado ? 'opacity-60' : ''} ${theme ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className="flex gap-3">
                          {p.imagen && <Image src={p.imagen} alt={p.nombre} width={64} height={64} className="object-cover rounded-xl" />}
                          <div className="flex-1">
                            <h3 className="font-bold">{p.nombre}</h3>
                            <p className="text-pink-500 font-black">{p.precio}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className={`h-2 w-24 rounded-full ${theme ? 'bg-white/10' : 'bg-gray-200'}`}>
                                <div className={`h-full rounded-full ${vendidos >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-pink-500 to-cyan-500'}`} style={{ width: `${vendidos}%` }}></div>
                              </div>
                              <span className="text-xs font-bold">{vendidos}/100 vendidos</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => eliminarProducto(p.id, p.nombre)} className="bg-red-500 text-white px-3 py-1 rounded-xl text-sm font-bold">🗑️</button>
                            <button onClick={() => sortearTodos(p)} className="bg-yellow-500 text-black px-3 py-1 rounded-xl text-xs font-bold">🎲 SIMULAR</button>
                          </div>
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
                    <input placeholder="Nombre (Ej: Bazar)" required value={catNombre} onChange={e => setCatNombre(e.target.value)} className={`flex-1 rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
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

            {activeTab === 'reels' && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h2 className="font-bold">Reels Promocionales</h2>
                  <button onClick={() => setShowReelForm(!showReelForm)} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-2xl font-bold text-sm">
                    {showReelForm ? '✕' : '+ Nuevo Reel'}
                  </button>
                </div>
                {showReelForm && (
                  <form onSubmit={crearReel} className="space-y-3 bg-white/5 rounded-2xl p-4">
                    <input placeholder="Título del reel" required value={reelData.titulo} onChange={e => setReelData({...reelData, titulo: e.target.value})} className={`w-full rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
                    <input placeholder="URL del video (TikTok, YouTube, etc)" value={reelData.video_url} onChange={e => setReelData({...reelData, video_url: e.target.value})} className={`w-full rounded-xl p-3 font-bold ${theme ? 'bg-white/10' : 'bg-gray-100'}`} />
                    <div>
                      <label className="text-sm font-bold block mb-2">Thumbnail (opcional)</label>
                      <input type="file" accept="image/*" ref={reelInputRef} onChange={handleReelThumbnailUpload} className="hidden" />
                      <button type="button" onClick={() => reelInputRef.current?.click()} className="w-full bg-gray-700 text-white p-3 rounded-xl font-bold text-sm">
                        📷 Subir imagen
                      </button>
                      {reelData.thumbnail_url && (
                        <img src={reelData.thumbnail_url} alt="preview" className="w-full h-32 object-cover rounded-xl mt-2" />
                      )}
                    </div>
                    <button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black py-3 rounded-xl">CREAR REEL 🎬</button>
                  </form>
                )}
                <div className="space-y-3">
                  {reels.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <span className="text-4xl mb-2 block">🎬</span>
                      <p className="text-sm">No hay reels todavía</p>
                    </div>
                  )}
                  {reels.map(r => (
                    <div key={r.id} className="bg-white/5 rounded-xl p-3 flex gap-3">
                      {r.thumbnail_url ? (
                        <img src={r.thumbnail_url} alt={r.titulo} className="w-20 h-20 rounded-xl object-cover" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 flex items-center justify-center text-2xl">🎬</div>
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-sm">{r.titulo}</p>
                        {r.video_url && <a href={r.video_url} target="_blank" className="text-xs text-pink-400">Ver video →</a>}
                      </div>
                    </div>
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
'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import LogoImg from '../../public/logo.png';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabaseClient';
import MercadoLibrePanel from '@/components/MercadoLibrePanel';

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [boletosData, setBoletosData] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', precio: '', imagen: '', categoria_id: '', telefono: '5493416971479', descripcion: '' });
  const [notif, setNotif] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  const [showSorteoModal, setShowSorteoModal] = useState(null);
  const [sorteando, setSorteando] = useState(false);
  const [showSorteoResult, setShowSorteoResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef(null);
  const theme = true;
  const ADMIN_PASSWORD = 'kiarateamo';

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
    } catch (err) { console.error('Error:', err); }
    setLoading(false);
  };

  const manualRefresh = () => { setRefreshKey(k => k + 1); fetchData(); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (password === ADMIN_PASSWORD) {
      setIsLoggedIn(true);
      localStorage.setItem('admin_logged', 'true');
    } else {
      setError('Contrasena incorrecta');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem('admin_logged');
    setIsLoggedIn(false);
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

  useEffect(() => {
    if (localStorage.getItem('admin_logged') === 'true') setIsLoggedIn(true);
  }, []);

  const crearProducto = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!formData.nombre || !formData.precio || !formData.categoria_id) { alert('Completá todos los campos'); setLoading(false); return; }
    const productoData = {
      nombre: formData.nombre,
      precio: formData.precio,
      imagen: formData.imagen || null,
      descripcion: formData.descripcion || null,
      categoria_id: parseInt(formData.categoria_id),
      telefono: '5493416971479'
    };
    try {
      const res = await fetch('/api/crear-producto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productoData) });
      const result = await res.json();
      if (!res.ok) alert('Error: ' + (result.error || 'Error desconocido'));
      else {
        setShowForm(false);
        setFormData({ nombre: '', precio: '', imagen: '', categoria_id: '', telefono: '5493416971479', descripcion: '' });
        setTimeout(() => { fetchData(); alert('✅ Producto creado con 100 números!'); }, 500);
      }
    } catch (err) { alert('Error al crear: ' + err.message); }
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
    try {
      const res = await fetch('/api/confirmar-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boleto_id: boleto.id, action: 'confirmar' })
      });
      const result = await res.json();
      
      if (result.success) {
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
        setNotif(`✅ Venta confirmada! #${String(boleto.numero).padStart(2,'0')} - ${boleto.nombre}`);
        setShowConfirmModal(null);
        fetchData();
        const msg = `✅ VENTA CONFIRMADA - MERCADO RIFAS\n\n#${String(boleto.numero).padStart(2,'0')} - ${boleto.nombre}\n\nTus numeros están asegurados!\nEl sorteo se realizará cuando se vendan los 100.`;
        if (boleto.whatsapp) window.open('https://wa.me/' + boleto.whatsapp + '?text=' + encodeURIComponent(msg), '_blank');
      } else {
        alert('Error: ' + (result.error || 'No se pudo confirmar'));
      }
    } catch (err) {
      alert('Error al confirmar venta');
    }
  };

  const cancelarReserva = async (boleto) => {
    if (!confirm(`Cancelar reserva #${boleto.numero}?\n\nEl número volverá a estar disponible.`)) return;
    try {
      const res = await fetch('/api/confirmar-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boleto_id: boleto.id, action: 'cancelar' })
      });
      const result = await res.json();
      
      if (result.success) {
        setNotif(`❌ Reserva cancelada #${boleto.numero}`);
        fetchData();
      } else {
        alert('Error: ' + (result.error || 'No se pudo cancelar'));
      }
    } catch (err) {
      alert('Error al cancelar reserva');
    }
  };

  const todosBoletos = Object.values(boletosData).flat();
  const pendientesPago = todosBoletos.filter(b => b.estado === 'reservado');
  const vendidosCount = todosBoletos.filter(b => b.estado === 'vendido').length;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F5]">
        <form onSubmit={handleLogin} className="relative z-10 w-full max-w-sm rounded-lg p-6 shadow-sm bg-white border border-[#EBEBEB]">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#1A3C6D] rounded-lg flex items-center justify-center text-white font-black text-xl mx-auto mb-4">MR</div>
            <h1 className="text-2xl font-black text-[#1A3C6D]">PANEL ADMIN</h1>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <div className="space-y-3">
            <input type="password" placeholder="Contrasena" value={password} onChange={e => setPassword(e.target.value)} required className="w-full rounded-lg p-4 font-bold bg-white border border-[#EBEBEB] focus:border-[#3483FA] outline-none text-[#333]" />
            <button disabled={loading} className="w-full bg-[#3483FA] text-white font-bold py-4 rounded-lg shadow-sm">{loading ? '⏳' : 'INGRESAR →'}</button>
          </div>
          <button type="button" onClick={() => router.push('/')} className="w-full mt-4 text-sm text-gray-500">← Volver</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-[#F5F5F5] text-[#333]">

      <header className="sticky top-0 z-40 bg-[#FFE600] border-b border-yellow-300 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1A3C6D] rounded-lg flex items-center justify-center text-white font-black text-sm">MR</div>
            <div>
              <h1 className="text-lg font-black text-[#1A3C6D]">ADMIN</h1>
              <p className="text-xs text-[#666]">Panel de control</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="bg-[#1A3C6D] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-[#152f55] transition-colors">Ver App 🎰</button>
            <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm">Salir</button>
          </div>
        </div>
      </header>

      {notif && (
        <div className="bg-[#39B54A] text-white px-4 py-3 text-center font-bold animate-bounce cursor-pointer" onClick={() => setNotif('')}>
          {notif} (toca para cerrar)
        </div>
      )}

      <main className="max-w-2xl mx-auto p-4 space-y-4 relative z-10">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-lg text-center bg-white border border-[#EBEBEB] shadow-sm">
            <p className="text-3xl mb-1">📬</p>
            <p className="text-2xl font-black text-[#3483FA]">{pendientesPago.length}</p>
            <p className="text-xs text-gray-500">Pendientes</p>
          </div>
          <div className="p-4 rounded-lg text-center bg-white border border-[#EBEBEB] shadow-sm">
            <p className="text-3xl mb-1">✅</p>
            <p className="text-2xl font-black text-[#39B54A]">{vendidosCount}</p>
            <p className="text-xs text-gray-500">Vendidos</p>
          </div>
          <div className="p-4 rounded-lg text-center bg-white border border-[#EBEBEB] shadow-sm">
            <p className="text-3xl mb-1">🎁</p>
            <p className="text-2xl font-black text-[#1A3C6D]">{productos.length}</p>
            <p className="text-xs text-gray-500">Rifas</p>
          </div>
        </div>

        <div className="rounded-lg bg-white border-2 border-[#FFE600] p-4 shadow-sm">
          <h2 className="font-black text-lg mb-3 flex items-center gap-2 text-[#333]">📬 BANDEJA DE ENTRADA - PAGOS PENDIENTES</h2>
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
                  <div key={b.id} className="bg-[#F5F5F5] rounded-lg p-4 border border-[#EBEBEB]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl font-black text-[#FFE600]">#{String(b.numero).padStart(2,'0')}</span>
                      <span className="text-xs bg-[#FFE600] text-[#333] px-2 py-1 rounded font-bold">⏳ 10 min</span>
                    </div>
                    <p className="font-bold text-lg text-[#333]">{b.nombre || 'Sin nombre'}</p>
                    <p className="text-gray-500 text-sm">{b.whatsapp}</p>
                    <p className="text-[#3483FA] font-black mt-1">{producto?.nombre} - {producto?.precio}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => setShowConfirmModal(b)} className="flex-1 bg-[#39B54A] text-white py-3 rounded-lg font-bold text-sm shadow-sm hover:bg-[#2d9e3d] transition-colors">✅ CONFIRMAR PAGO</button>
                      <button onClick={() => cancelarReserva(b)} className="bg-red-500 text-white px-4 py-3 rounded-lg font-bold text-sm">❌</button>
                      {b.whatsapp && <button onClick={() => window.open('https://wa.me/' + b.whatsapp, '_blank')} className="bg-[#39B54A] text-white px-4 py-3 rounded-lg font-bold text-sm">📱</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white border border-[#EBEBEB] p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-[#333]">🎁 MIS RIFAS</h2>
            <button onClick={() => setShowForm(!showForm)} className="bg-[#3483FA] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-[#2d6fd4] transition-colors">{showForm ? '✕ Cancelar' : '+ Nueva Rifa'}</button>
          </div>

          {showForm && (
            <form onSubmit={crearProducto} className="p-4 rounded-lg bg-[#F5F5F5] space-y-3 mb-4 border border-[#EBEBEB]">
              <input placeholder="Nombre del producto" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" />
              <input placeholder="Precio (Ej: $3500- pesos)" required value={formData.precio} onChange={e => setFormData({...formData, precio: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" />
              <textarea placeholder="Descripcion (opcional)" value={formData.descripcion || ''} onChange={e => setFormData({...formData, descripcion: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" rows="2" />
              <select required value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]">
                <option value="">Selecciona categoria</option>
                {categorias.map(c => {
                  const emoji = c.nombre === 'Zapatillas' ? '👟' : c.nombre === 'Celulares' ? '📱' : c.nombre === 'Tecnologia' ? '💻' : c.nombre === 'Electrodomesticos' ? '⚡' : c.nombre === 'Hogar' ? '🏠' : '🎁';
                  return <option key={c.id} value={c.id}>{emoji} {c.nombre}</option>;
                })}
              </select>
              <div>
                <label className="text-sm font-bold block mb-2 text-[#333]">Imagen del producto</label>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage} className="w-full bg-[#3483FA] text-white p-3 rounded-lg font-bold shadow-sm">{uploadingImage ? '⏳ Subiendo...' : '📷 Subir imagen'}</button>
                {formData.imagen && <div className="relative mt-2"><img src={formData.imagen} alt="preview" className="w-full h-40 object-cover rounded-lg" /><button type="button" onClick={() => setFormData({...formData, imagen: ''})} className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full">✕</button></div>}
              </div>
              <button disabled={loading} className="w-full bg-[#3483FA] text-white py-3 rounded-lg font-bold shadow-sm hover:bg-[#2d6fd4] transition-colors">{loading ? '⏳ Creando...' : 'CREAR RIFA 🎁'}</button>
            </form>
          )}

          <div className="space-y-3">
            {productos.map(p => {
              const vend = (boletosData[p.id] || []).filter(b => b.estado === 'vendido').length;
              const res = (boletosData[p.id] || []).filter(b => b.estado === 'reservado').length;
              const porcent = Math.round((vend / 100) * 100);
              return (
                <div key={p.id} className={`p-4 rounded-lg bg-[#F5F5F5] border border-[#EBEBEB] ${p.finalizado ? 'opacity-60' : ''}`}>
                  <div className="flex gap-3">
                    {p.imagen && <img src={p.imagen} alt={p.nombre} className="w-16 h-16 object-cover rounded-lg" />}
                    <div className="flex-1">
                      <h3 className="font-bold text-[#333]">{p.nombre}</h3>
                      <p className="text-[#39B54A] font-black">{p.precio}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-[#3483FA] font-bold">✅ {vend}/100</span>
                        {res > 0 && <span className="text-[#FFE600] font-bold">⏳ {res} reservados</span>}
                        <div className="flex-1 h-2 bg-[#EBEBEB] rounded-full overflow-hidden"><div className={`h-full rounded-full ${vend >= 100 ? 'bg-[#39B54A]' : 'bg-[#3483FA]'}`} style={{ width: porcent + '%' }}></div></div>
                      </div>
                    </div>
                    <button onClick={() => eliminarProducto(p.id, p.nombre)} className="bg-red-500 text-white px-3 py-2 rounded-lg font-bold self-start">🗑️</button>
                  </div>
                  {vend >= 100 && !p.finalizado && (
                    <div className="mt-3 space-y-2">
                      <div className="bg-[#39B54A] text-white text-center py-2 rounded-lg font-bold text-sm shadow-sm animate-pulse">🎉 TODOS VENDIDOS - LISTO PARA SORTEAR</div>
                      <button
                        onClick={() => setShowSorteoModal(p)}
                        className="w-full bg-[#FFE600] text-[#333] font-bold py-3 rounded-lg text-sm shadow-sm hover:bg-[#f0d800] transition-colors"
                      >
                        🎰 SORTEO QUINIENA NOCTURNA (21HS)
                      </button>
                    </div>
                  )}
                  {p.finalizado && <div className="mt-3 bg-[#FFE600] text-[#333] text-center py-2 rounded-lg font-bold text-sm shadow-sm">🏆 GANADOR: #{String(p.ganador_num).padStart(2,'0')} - {p.ganador_nombre}</div>}
                </div>
              );
            })}
          </div>
        </div>

          <MercadoLibrePanel categorias={categorias} />

          <div className="rounded-lg bg-white border border-[#EBEBEB] p-4 shadow-sm">
          <h2 className="font-black text-lg mb-3 text-[#1A3C6D]">📋 CÓMO FUNCIONA</h2>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 items-start"><span className="text-2xl">🛒</span><div><p className="font-bold text-[#333]">Importar de Mercado Libre</p><p className="text-gray-500">Usa el panel "Importar de Mercado Libre" para buscar productos populares y crear rifas con 1 click. También podés crear manualmente con "+ Nueva Rifa".</p></div></div>
            <div className="flex gap-3 items-start"><span className="text-2xl">2️⃣</span><div><p className="font-bold text-[#333]">Recibir Reservas</p><p className="text-gray-500">Cuando alguien elige números, aparecen en la "Bandeja de Entrada". Verificá el pago antes de confirmar.</p></div></div>
            <div className="flex gap-3 items-start"><span className="text-2xl">3️⃣</span><div><p className="font-bold text-[#333]">Confirmar Pagos</p><p className="text-gray-500">Click en "✅ CONFIRMAR PAGO" para marcar como vendido. Se le notifica al comprador por WhatsApp.</p></div></div>
            <div className="flex gap-3 items-start"><span className="text-2xl">🀄</span><div><p className="font-bold text-[#333]">Sorteo por Quiniela Nacional Nocturna</p><p className="text-gray-500">Cuando se vendan los 100 números, usa el botón "SORTEO QUINIENA NOCTURNA (21HS)". El ganador se define con las últimas 2 cifras de la cabeza del sorteo Nocturna (21hs) de la Quiniela Nacional. El sorteo debe realizarse después de las 21hs. 100% transparente.</p></div></div>
          </div>
        </div>
      </main>

      <div className="max-w-2xl mx-auto px-4 mb-4">
        <div className="flex gap-2">
          <button onClick={manualRefresh} className="flex-1 bg-white text-[#333] py-2 rounded-lg font-bold text-sm border border-[#EBEBEB] shadow-sm">🔄 Actualizar datos</button>
          <button onClick={() => setShowDebug(!showDebug)} className={`flex-1 py-2 rounded-lg font-bold text-sm ${showDebug ? 'bg-red-500 text-white' : 'bg-[#1A3C6D] text-white'} shadow-sm`}>🐛 DEBUG {showDebug ? 'OCULTAR' : 'MOSTRAR'}</button>
        </div>
      </div>

      {showDebug && (
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <div className="bg-white border border-red-300 rounded-lg p-4 shadow-sm">
            <h3 className="font-black text-red-500 mb-3">🔴 DEBUG - TODOS LOS BOLETOS</h3>
            <div className="text-xs text-gray-500 mb-3">
              <p>Total boletos: {todosBoletos.length}</p>
              <p>Reservados: {pendientesPago.length}</p>
              <p>Vendidos: {vendidosCount}</p>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {productos.map(prod => {
                const prodBoletos = boletosData[prod.id] || [];
                const reservados = prodBoletos.filter(b => b.estado === 'reservado');
                const vendidos = prodBoletos.filter(b => b.estado === 'vendido');
                return (
                  <div key={prod.id} className="border border-[#EBEBEB] rounded-lg p-2">
                    <p className="font-bold text-[#FFE600]">{prod.nombre} ({prodBoletos.length} boletos)</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {reservados.length > 0 && (
                        <div className="w-full">
                          <p className="text-orange-500 text-xs font-bold">RESERVADOS ({reservados.length}):</p>
                          {reservados.map(b => (
                            <span key={b.id} className="bg-orange-100 text-orange-600 px-1 rounded text-xs mr-1">#{String(b.numero).padStart(2,'0')} ({b.nombre})</span>
                          ))}
                        </div>
                      )}
                      {vendidos.length > 0 && (
                        <div className="w-full">
                          <p className="text-[#39B54A] text-xs font-bold">VENDIDOS ({vendidos.length}):</p>
                          {vendidos.map(b => (
                            <span key={b.id} className="bg-green-100 text-[#39B54A] px-1 rounded text-xs mr-1">#{String(b.numero).padStart(2,'0')}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(null)}></div>
          <div className="relative w-full max-w-sm rounded-lg p-6 text-center bg-white border border-[#EBEBEB] shadow-lg">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-black text-[#333]">CONFIRMAR PAGO</h2>
            <p className="text-5xl font-black text-[#FFE600] my-4">#{String(showConfirmModal.numero).padStart(2,'0')}</p>
            <p className="text-xl font-bold text-[#333]">{showConfirmModal.nombre}</p>
            <p className="text-gray-500 mb-6">{showConfirmModal.whatsapp}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(null)} className="flex-1 py-3 rounded-lg font-bold bg-gray-100 text-[#333] border border-[#EBEBEB]">Cancelar</button>
              <button onClick={() => confirmarVenta(showConfirmModal)} className="flex-1 py-3 rounded-lg font-bold bg-[#39B54A] text-white shadow-sm">Confirmar ✅</button>
            </div>
          </div>
        </div>
      )}

      {showSorteoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSorteoModal(null)}></div>
          <div className="relative w-full max-w-md rounded-lg p-6 text-center bg-white border border-[#EBEBEB] shadow-lg">
            <div className="text-6xl mb-4">🎰</div>
            <h2 className="text-2xl font-black text-[#1A3C6D]">REALIZAR SORTEO</h2>
            <p className="text-lg font-bold mt-4 text-[#333]">{showSorteoModal.nombre}</p>
            <p className="text-[#39B54A] font-black text-xl">{showSorteoModal.precio}</p>
            <div className="mt-4 p-4 rounded-lg bg-[#FFE600]/10 border border-[#FFE600]/30">
              <p className="font-bold text-sm text-[#333]">Método de sorteo:</p>
              <p className="text-lg font-black text-[#FFE600]">🀄 QUINIENA NACIONAL NOCTURNA</p>
              <p className="text-xs text-gray-500 mt-1">Se usan las últimas 2 cifras de la cabeza de la Quiniela Nacional Nocturna (sorteo de las 21hs). 100% transparente.</p>
            </div>
            {showSorteoResult && (
              <div className={`mt-4 p-4 rounded-lg ${showSorteoResult.success ? 'bg-[#39B54A]/10 border border-[#39B54A]/30' : 'bg-red-50 border border-red-200'}`}>
                {showSorteoResult.success ? (
                  <>
                    <span className="text-5xl block mb-2 animate-bounce">🎊</span>
                    <p className="text-2xl font-black text-[#39B54A]">GANADOR!</p>
                    <p className="text-6xl font-black text-[#FFE600] my-2">#{String(showSorteoResult.ganador.numero).padStart(2,'0')}</p>
                    <p className="text-xl font-bold text-[#333]">{showSorteoResult.ganador.nombre}</p>
                    {showSorteoResult.quiniela && (
                      <div className="mt-3 text-xs text-gray-500">
                        <p>Quiniela Nacional Nocturna: {showSorteoResult.quiniela.numero_completo}</p>
                        <p>Últimas 2 cifras: {showSorteoResult.quiniela.ultimas_dos}</p>
                        <p>Significado: {showSorteoResult.quiniela.significado}</p>
                      </div>
                    )}
                    <button onClick={() => { setShowSorteoModal(null); setShowSorteoResult(null); fetchData(); }} className="mt-4 bg-[#39B54A] text-white font-bold py-3 px-8 rounded-lg shadow-sm hover:bg-[#2d9e3d] transition-colors">
                      CERRAR 🎉
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-red-600 font-bold">Error: {showSorteoResult.error}</p>
                    <button onClick={() => setShowSorteoResult(null)} className="mt-3 bg-gray-100 text-[#333] font-bold py-2 px-6 rounded-lg border border-[#EBEBEB]">Volver</button>
                  </>
                )}
              </div>
            )}
            {!showSorteoResult && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSorteoModal(null)}
                  className="flex-1 py-3 rounded-lg font-bold bg-gray-100 text-[#333] border border-[#EBEBEB]"
                  disabled={sorteando}
                >Cancelar</button>
                <button
                  onClick={async () => {
                    setSorteando(true);
                    try {
                      const res = await fetch('/api/sortear', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ producto_id: showSorteoModal.id, metodo: 'quiniela' })
                      });
                      const result = await res.json();
                      setShowSorteoResult(result);
                      if (result.success) {
                        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#FFE600', '#3483FA', '#39B54A'] });
                      }
                    } catch (err) {
                      setShowSorteoResult({ success: false, error: 'Error de conexion' });
                    }
                    setSorteando(false);
                  }}
                  disabled={sorteando}
                  className="flex-1 py-3 rounded-lg font-bold bg-[#FFE600] text-[#333] shadow-sm disabled:opacity-50 hover:bg-[#f0d800] transition-colors"
                >
                  {sorteando ? '⏳ SORTEANDO...' : '🎰 SORTEAR'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabaseClient';
import { generarMensajeGanador, generarMensajeAdmin, generarMensajeSorteoProgramado, abrirWhatsAppAdmin, abrirWhatsAppNumero } from '@/lib/notificaciones';

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [boletosData, setBoletosData] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', price: '', raffle_price: '', images: ['', '', ''], categoria_id: '', description: '', numbers_total: '100' });
  const [notif, setNotif] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(null);
  const [showSorteoModal, setShowSorteoModal] = useState(null);
  const [sorteando, setSorteando] = useState(false);
  const [showSorteoResult, setShowSorteoResult] = useState(null);
  const [showNotifModal, setShowNotifModal] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showEditForm, setShowEditForm] = useState(null);
  const [pagosData, setPagosData] = useState([]);
  const [showPagosSection, setShowPagosSection] = useState(false);
  const [pagosFiltro, setPagosFiltro] = useState('todos');
  const [showPagoDetail, setShowPagoDetail] = useState(null);
  const [productoSearch, setProductoSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const WHATSAPP = '5493412500029';

  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved === 'true') {
      setIsLoggedIn(true);
      setCheckingSession(false);
    } else if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const user = data.session?.user;
        if (user && user.email === 'estudiowebpin@gmail.com') {
          localStorage.setItem('admin_token', 'true');
          setIsLoggedIn(true);
        }
        setCheckingSession(false);
      }).catch(() => setCheckingSession(false));
    } else {
      setCheckingSession(false);
    }
  }, []);

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

  useEffect(() => {
    if (isLoggedIn) fetchPagos(pagosFiltro);
  }, [isLoggedIn, refreshKey]);

  useEffect(() => {
    if (isLoggedIn) fetchPagos(pagosFiltro);
  }, [pagosFiltro]);

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

  const fetchPagos = async (estado) => {
    try {
      const params = new URLSearchParams();
      if (estado && estado !== 'todos') params.set('estado', estado);
      const res = await fetch('/api/pagos?' + params.toString());
      const result = await res.json();
      if (result.success) setPagosData(result.data);
    } catch (err) { console.error('Error fetching pagos:', err); }
  };

  const manualRefresh = () => { setRefreshKey(k => k + 1); fetchData(); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, email })
      });
      const data = await res.json();
      if (data.success) {
        setIsLoggedIn(true);
        localStorage.setItem('admin_token', 'true');
      } else {
        setError(data.error || 'Contrasena incorrecta');
      }
    } catch (err) {
      setError('Error de conexion');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem('admin_token');
    setIsLoggedIn(false);
    setPassword('');
  };

  const handleImageUpload = async (e, index) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const uploadFormData = new FormData();
    uploadFormData.append('image', file);
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: uploadFormData });
      const data = await res.json();
      if (data.url) {
        const newImages = [...formData.images];
        newImages[index] = data.url;
        setFormData({...formData, images: newImages});
      }
    } catch (err) { console.error('Upload error:', err); }
    setUploadingImage(false);
  };

  const crearProducto = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!formData.title || !formData.raffle_price) { alert('Completá todos los campos requeridos'); setLoading(false); return; }
    const productoData = {
      nombre: formData.title,
      descripcion: formData.description || null,
      imagen: formData.images.filter(u => u)[0] || null,
      images: formData.images.filter(u => u),
      price: parseFloat(formData.price) || 0,
      precio: formData.raffle_price,
      categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
      numbers_total: parseInt(formData.numbers_total) || 100
    };
    try {
      const res = await fetch('/api/crear-producto', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productoData) });
      const result = await res.json();
      if (!res.ok) alert('Error: ' + (result.error || 'Error desconocido'));
      else {
        setShowForm(false);
        setFormData({ title: '', price: '', raffle_price: '', images: ['', '', ''], categoria_id: '', description: '', numbers_total: '100' });
        setTimeout(() => { fetchData(); alert('✅ Producto creado con 100 números!'); }, 500);
      }
    } catch (err) { alert('Error al crear: ' + err.message); }
    setLoading(false);
  };

  const actualizarProducto = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/actualizar-producto', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: showEditForm.id,
          nombre: showEditForm.title,
          descripcion: showEditForm.description || null,
          imagen: showEditForm.images.filter(u => u)[0] || null,
          images: showEditForm.images.filter(u => u),
          price: parseFloat(showEditForm.price) || 0,
          precio: showEditForm.raffle_price,
          categoria_id: showEditForm.categoria_id ? parseInt(showEditForm.categoria_id) : null
        })
      });
      const result = await res.json();
      if (!res.ok) alert('Error: ' + (result.error || 'Error desconocido'));
      else {
        setShowEditForm(null);
        fetchData();
        alert('✅ Producto actualizado!');
      }
    } catch (err) { alert('Error al actualizar: ' + err.message); }
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

  const regenerarBoletos = async (productoId, nombre) => {
    if (!confirm(`¿Regenerar números para "${nombre}"?\n\nSolo se crearán si el producto no tiene números.`)) return;
    try {
      const res = await fetch('/api/generar-boletos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producto_id: productoId })
      });
      const result = await res.json();
      if (result.success) {
        setNotif(`✅ ${result.message}`);
        fetchData();
      } else {
        alert('Error: ' + (result.error || 'Error desconocido'));
      }
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
        fetch('/api/pagos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boleto_id: boleto.id, estado: 'confirmado' })
        }).catch(() => {});

        const producto = productos?.find(p => p.id === boleto.producto_id);
        const msgCompra = `✅ VENTA CONFIRMADA - Eco Rifas\n\n#${String(boleto.numero).padStart(2,'0')} - ${boleto.nombre}\n\nTus numeros están asegurados!\nEl sorteo se realizará cuando se vendan los 100.`;
        if (boleto.whatsapp) window.open('https://wa.me/' + boleto.whatsapp + '?text=' + encodeURIComponent(msgCompra), '_blank');

        if (result.sorteo) {
          if (result.sorteo.estado === 'completado') {
            const g = result.sorteo.ganador;
            setNotif(`🏆 SORTEO COMPLETADO! Ganador: #${String(g.numero).padStart(2,'0')} - ${g.nombre} (Quiniela Nocturna)`);
            confetti({ particleCount: 200, spread: 80, origin: { y: 0.5 } });

            // 1. Abrir WhatsApp Admin con resumen completo + lista de participantes
            abrirWhatsAppAdmin(generarMensajeAdmin(producto, g, result.sorteo.participantes));

            // 2. Abrir WhatsApp Ganador con coordinación + CTA seguír participando
            setTimeout(() => {
              if (g.whatsapp) {
                abrirWhatsAppNumero(g.whatsapp, generarMensajeGanador(g, producto));
              }
            }, 1500);

            // 3. Modal con CTA "Seguir participando" + mensaje copiable para no-ganadores
            if (result.sorteo.participantes && result.sorteo.participantes.length > 1) {
              const activos = productos.filter(p => !p.finalizado && p.id !== producto?.id);
              setShowNotifModal({
                ganador: g,
                producto: producto,
                participantes: result.sorteo.participantes.filter(p => p.whatsapp && p.whatsapp !== g.whatsapp),
                productosActivos: activos
              });
            }
          } else if (result.sorteo.estado === 'programado') {
            const { admin: msgAdmin, participantes } = generarMensajeSorteoProgramado(
              producto, result.sorteo.fecha, result.sorteo.motivo, result.sorteo.participantes
            );
            const fecha = result.sorteo.fecha ? new Date(result.sorteo.fecha) : null;
            const fechaStr = fecha ? fecha.toLocaleDateString('es-AR', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'próximo día hábil';

            setNotif(`📅 Sorteo programado: ${fechaStr} (${result.sorteo.motivo || ''})`);

            // Admin notification
            abrirWhatsAppAdmin(msgAdmin);

            // Notificar participantes programados (solo abrimos 1 o 2 para evitar bloqueos)
            if (participantes.length > 0) {
              setTimeout(() => {
                abrirWhatsAppNumero(participantes[0].whatsapp, participantes[0].msg);
              }, 1500);
              if (participantes.length > 1) {
                setTimeout(() => {
                  abrirWhatsAppNumero(participantes[1].whatsapp, participantes[1].msg);
                }, 3000);
              }
            }
          }
        }
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
        fetch('/api/pagos', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boleto_id: boleto.id, estado: 'cancelado' })
        }).catch(() => {});
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

  const [showUsers, setShowUsers] = useState(false);

  const usuariosMap = {};
  todosBoletos.filter(b => b.estado === 'vendido' && b.whatsapp).forEach(b => {
    if (!usuariosMap[b.whatsapp]) {
      usuariosMap[b.whatsapp] = { nombre: b.nombre, whatsapp: b.whatsapp, boletos: [], totalGastado: 0, productosComprados: new Set() };
    }
    usuariosMap[b.whatsapp].boletos.push(b);
    usuariosMap[b.whatsapp].totalGastado += 1;
    if (b.producto_id) usuariosMap[b.whatsapp].productosComprados.add(b.producto_id);
  });
  const usuarios = Object.values(usuariosMap).map(u => ({
    ...u,
    productosComprados: u.productosComprados.size,
    boletosCount: u.boletos.length
  })).sort((a, b) => b.boletosCount - a.boletosCount);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F5]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#25F4EE]/30 border-t-[#25F4EE] rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-bold">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#F5F5F5]">
        <form onSubmit={handleLogin} className="relative z-10 w-full max-w-sm rounded-lg p-6 shadow-sm bg-white border border-[#EBEBEB]">
          <div className="text-center mb-6">
            <img src="/logo.png" alt="Eco Rifas" className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-[#111827]">PANEL ADMIN</h1>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <div className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full rounded-lg p-4 font-bold bg-white border border-[#EBEBEB] focus:border-[#FE2C55] outline-none text-[#333]" />
            <input type="password" placeholder="Contrasena" value={password} onChange={e => setPassword(e.target.value)} required className="w-full rounded-lg p-4 font-bold bg-white border border-[#EBEBEB] focus:border-[#FE2C55] outline-none text-[#333]" />
            <button disabled={loading} className="w-full bg-gradient-to-r from-[#FE2C55] to-[#C12045] text-black font-bold py-4 rounded-lg shadow-lg">{loading ? '⏳' : 'INGRESAR →'}</button>
          </div>
          <button type="button" onClick={() => router.push('/')} className="w-full mt-4 text-sm text-gray-500">← Volver</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-[#F5F5F5] text-[#333]">

      <header className="sticky top-0 z-40 bg-[#111827] border-b border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Eco Rifas" className="w-10 h-10" />
            <div>
              <h1 className="text-lg font-black text-[#FE2C55]">ADMIN</h1>
              <p className="text-xs text-gray-400">Panel de control - Eco Rifas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="bg-[#111111] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-[#222222] transition-colors">Ver App 🎰</button>
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
            <p className="text-2xl font-black text-[#111827]">{productos.length}</p>
            <p className="text-xs text-gray-500">Rifas</p>
          </div>
        </div>

        <div className="rounded-lg bg-white border-2 border-[#25F4EE] p-4 shadow-sm">
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
                      <span className="text-3xl font-black text-[#25F4EE]">#{String(b.numero).padStart(2,'0')}</span>
                      <span className="text-xs bg-[#111827] text-[#333] px-2 py-1 rounded font-bold">⏳ 10 min</span>
                    </div>
                    <p className="font-bold text-lg text-[#333]">{b.nombre || 'Sin nombre'}</p>
                    <p className="text-gray-500 text-sm">{b.whatsapp}</p>
                    <p className="text-[#3483FA] font-black mt-1">{producto?.title || producto?.nombre} - ${(producto?.raffle_price || 0).toLocaleString('es-AR')}-</p>
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
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-black text-[#333]">💳 PAGOS ({pagosData.length})</h2>
            <div className="flex gap-1">
              {['todos', 'pendiente', 'confirmado', 'cancelado'].map(f => (
                <button key={f} onClick={() => setPagosFiltro(f)}
                  className={`px-2 py-1 rounded text-xs font-bold ${pagosFiltro === f ? 'bg-[#111827] text-white' : 'bg-gray-100 text-gray-500'}`}
                >{f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
              ))}
            </div>
          </div>
          {pagosData.length === 0 ? (
            <div className="text-center py-4 text-gray-500"><p className="text-sm font-bold">Sin pagos registrados</p></div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {pagosData.map(p => {
                const prod = productos.find(x => x.id === p.producto_id);
                return (
                  <div key={p.id} onClick={() => setShowPagoDetail(p)}
                    className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-colors hover:shadow-sm ${
                      p.estado === 'pendiente' ? 'bg-amber-50 border-amber-200' :
                      p.estado === 'confirmado' ? 'bg-green-50 border-green-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <span className="text-2xl font-black text-[#333]">#{String(p.numero).padStart(2,'0')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[#333] truncate">{p.nombre || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-500">{p.whatsapp} · ${parseFloat(p.monto || 0).toLocaleString('es-AR')}-</p>
                      <p className="text-xs text-gray-400 truncate">{prod?.title || prod?.nombre} · {p.alias_usado}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        p.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                        p.estado === 'confirmado' ? 'bg-green-100 text-green-700' :
                        'bg-gray-200 text-gray-500'
                      }`}>{p.estado}</span>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(p.created_at).toLocaleDateString('es-AR')}</p>
                    </div>
                    {p.comprobante_url && <span className="text-lg">📸</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

          <div className="rounded-lg bg-white border border-[#EBEBEB] p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-black text-[#333]">🎁 MIS RIFAS ({productos.length})</h2>
            <button onClick={() => setShowForm(!showForm)} className="bg-[#3483FA] text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-[#2d6fd4] transition-colors">{showForm ? '✕ Cancelar' : '+ Nueva Rifa'}</button>
          </div>

          <div className="flex gap-2 mb-4">
            <input type="text" placeholder="🔍 Buscar rifa por nombre..." value={productoSearch} onChange={e => setProductoSearch(e.target.value)} className="flex-1 rounded-lg p-3 font-bold bg-[#F5F5F5] border border-[#EBEBEB] text-[#333] text-sm" />
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="rounded-lg p-3 font-bold bg-[#F5F5F5] border border-[#EBEBEB] text-[#333] text-sm">
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="finalizados">Finalizados</option>
            </select>
          </div>

          {showForm && (
            <form onSubmit={crearProducto} className="p-4 rounded-lg bg-[#F5F5F5] space-y-3 mb-4 border border-[#EBEBEB]">
              <input placeholder="Titulo del producto *" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Precio original (ARS)" type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" />
                <input placeholder="Precio rifa (ARS) *" type="number" required value={formData.raffle_price} onChange={e => setFormData({...formData, raffle_price: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" />
              </div>
              <input placeholder="Cantidad de numeros (default 100)" type="number" value={formData.numbers_total} onChange={e => setFormData({...formData, numbers_total: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" />
              <textarea placeholder="Descripcion del producto (opcional)" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" rows="2" />
              <select value={formData.categoria_id} onChange={e => setFormData({...formData, categoria_id: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]">
                <option value="">Selecciona categoria (opcional)</option>
                {categorias.map(c => {
                  const emoji = c.nombre === 'Tecnología' || c.nombre === 'Tecnologia' ? '💻' : c.nombre === 'Indumentaria' ? '👕' : c.nombre === 'Hogar' ? '🏠' : '🎁';
                  return <option key={c.id} value={c.id}>{emoji} {c.nombre}</option>;
                })}
              </select>
              <div>
                <label className="text-sm font-bold block mb-2 text-[#333]">Imágenes del producto (máx 3)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="relative">
                      {formData.images[i] ? (
                        <div className="relative">
                          <img src={formData.images[i]} alt={`Foto ${i + 1}`} className="w-full h-28 object-cover rounded-lg border border-[#EBEBEB]" />
                          <button type="button" onClick={() => { const newImages = [...formData.images]; newImages[i] = ''; setFormData({...formData, images: newImages}); }} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center">✕</button>
                        </div>
                      ) : (
                        <div className="w-full h-28 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-white">
                          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                            <span className="text-2xl">📷</span>
                            <span className="text-[10px] text-gray-400 mt-1">Foto {i + 1}</span>
                            <input type="file" accept="image/*" onChange={e => handleImageUpload(e, i)} className="hidden" />
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button disabled={loading} className="w-full bg-[#3483FA] text-white py-3 rounded-lg font-bold shadow-sm hover:bg-[#2d6fd4] transition-colors">{loading ? '⏳ Creando...' : 'CREAR RIFA 🎁'}</button>
            </form>
          )}

          <div className="space-y-3">
            {productos.filter(p => {
              const matchSearch = !productoSearch || (p.title || p.nombre || '').toLowerCase().includes(productoSearch.toLowerCase());
              const matchEstado = filterEstado === 'todos' || (filterEstado === 'activos' && !p.finalizado) || (filterEstado === 'finalizados' && p.finalizado);
              return matchSearch && matchEstado;
            }).map(p => {
              const vend = (boletosData[p.id] || []).filter(b => b.estado === 'vendido').length;
              const res = (boletosData[p.id] || []).filter(b => b.estado === 'reservado').length;
              const totalNums = p.numbers_total || 100;
              const porcent = totalNums > 0 ? Math.round((vend / totalNums) * 100) : 0;
              return (
                <div key={p.id} className={`p-4 rounded-lg bg-[#F5F5F5] border border-[#EBEBEB] ${p.finalizado ? 'opacity-60' : ''}`}>
                  <div className="flex gap-3">
                    {(p.image || p.imagen) && <img src={p.image || p.imagen} alt={p.title || p.nombre} className="w-16 h-16 object-cover rounded-lg" />}
                    <div className="flex-1">
                      <h3 className="font-bold text-[#333]">{p.title || p.nombre}</h3>
                      <p className="text-[#39B54A] font-black">${(p.raffle_price || 0).toLocaleString('es-AR')}-</p>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="text-[#3483FA] font-bold">✅ {vend}/{p.numbers_total || 100}</span>
                        {res > 0 && <span className="text-amber-500 font-bold">⏳ {res} reservados</span>}
                        <div className="flex-1 h-2 bg-[#EBEBEB] rounded-full overflow-hidden"><div className={`h-full rounded-full ${vend >= 100 ? 'bg-[#39B54A]' : 'bg-[#3483FA]'}`} style={{ width: porcent + '%' }}></div></div>
                      </div>
                    </div>
                    <div className="flex gap-1 self-start">
                      <button onClick={() => setShowEditForm({ ...p, title: p.title || p.nombre, description: p.description || p.descripcion, price: p.price || 0, raffle_price: p.raffle_price || 0, categoria_id: p.categoria_id || '', images: [p.image || p.imagen || '', '', ''] })} className="bg-[#3483FA] text-white px-3 py-2 rounded-lg font-bold text-sm">✏️</button>
                      <button onClick={() => eliminarProducto(p.id, p.title || p.nombre)} className="bg-red-500 text-white px-3 py-2 rounded-lg font-bold">🗑️</button>
                      {(boletosData[p.id] || []).length === 0 && (
                        <button onClick={() => regenerarBoletos(p.id, p.title || p.nombre)} className="bg-amber-500 text-white px-3 py-2 rounded-lg font-bold text-sm">🔁</button>
                      )}
                    </div>
                  </div>
                  {vend >= 100 && !p.finalizado && (
                    <div className="mt-3 space-y-2">
                      <div className="bg-[#39B54A] text-white text-center py-2 rounded-lg font-bold text-sm shadow-sm animate-pulse">🎉 TODOS VENDIDOS - LISTO PARA SORTEAR</div>
                      <button
                      onClick={() => setShowSorteoModal(p)}
                         className="w-full bg-[#111827] text-white font-bold py-3 rounded-lg text-sm shadow-sm hover:bg-[#f0d800] hover:text-[#333] transition-colors"
                      >
                        🎰 SORTEO QUINIELA NOCTURNA (21HS)
                      </button>
                    </div>
                  )}
                  {p.finalizado && <div className="mt-3 bg-[#111827] text-[#333] text-center py-2 rounded-lg font-bold text-sm shadow-sm">🏆 GANADOR: #{String(p.ganador_num).padStart(2,'0')} - {p.ganador_nombre}</div>}
                </div>
              );
            })}
          </div>
        </div>

          <div className="rounded-lg bg-white border border-[#EBEBEB] p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-black text-lg text-[#111827]">👥 USUARIOS ({usuarios.length})</h2>
              <button onClick={() => setShowUsers(!showUsers)} className={`px-4 py-2 rounded-lg font-bold text-sm shadow-sm ${showUsers ? 'bg-red-500 text-white' : 'bg-[#3483FA] text-white'}`}>
                {showUsers ? '✕ Ocultar' : '📊 Ver usuarios'}
              </button>
            </div>
            {showUsers && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {usuarios.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <span className="text-5xl block mb-3">👥</span>
                    <p className="font-bold">No hay usuarios aún</p>
                  </div>
                ) : (
                  usuarios.map((u, i) => (
                    <div key={u.whatsapp} className="bg-[#F5F5F5] rounded-lg p-4 border border-[#EBEBEB]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-[#111827]">#{i + 1}</span>
                          <span className="font-bold text-[#333]">{u.nombre || 'Sin nombre'}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.boletosCount >= 5 ? 'bg-[#FE2C55]/10 text-[#C12045]' : 'bg-blue-100 text-blue-700'}`}>
                          {u.boletosCount} nums
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">📱 {u.whatsapp}</p>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-[#3483FA]/10 text-[#3483FA] px-2 py-1 rounded font-bold">🎁 {u.productosComprados} productos</span>
                        <span className="bg-[#39B54A]/10 text-[#39B54A] px-2 py-1 rounded font-bold">🎟️ {u.boletosCount} boletos</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {u.boletos.slice(0, 5).map(b => {
                          const prod = productos.find(p => p.id === b.producto_id);
                          return (
                            <span key={b.id} className="text-[10px] bg-white border border-[#EBEBEB] px-1.5 py-0.5 rounded font-bold text-[#333]">
                              #{String(b.numero).padStart(2,'0')} {prod ? `- ${(prod.title || prod.nombre).substring(0, 15)}...` : ''}
                            </span>
                          );
                        })}
                        {u.boletos.length > 5 && <span className="text-[10px] text-gray-400">+{u.boletos.length - 5} más</span>}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => window.open('https://wa.me/' + u.whatsapp, '_blank')} className="text-xs bg-[#39B54A] text-white px-3 py-1.5 rounded-lg font-bold">📱 Contactar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white border border-[#EBEBEB] p-4 shadow-sm">
          <h2 className="font-black text-lg mb-3 text-[#111827]">📋 CÓMO FUNCIONA</h2>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 items-start"><span className="text-2xl">🛒</span><div><p className="font-bold text-[#333]">Crear productos</p><p className="text-gray-500">Usá "+ Nueva Rifa" para crear productos manualmente con título, precio, imagen y cantidad de números.</p></div></div>
            <div className="flex gap-3 items-start"><span className="text-2xl">2️⃣</span><div><p className="font-bold text-[#333]">Recibir Reservas</p><p className="text-gray-500">Cuando alguien elige números, aparecen en la "Bandeja de Entrada". Verificá el pago antes de confirmar.</p></div></div>
            <div className="flex gap-3 items-start"><span className="text-2xl">3️⃣</span><div><p className="font-bold text-[#333]">Confirmar Pagos</p><p className="text-gray-500">Click en "✅ CONFIRMAR PAGO" para marcar como vendido. Se le notifica al comprador por WhatsApp.</p></div></div>
            <div className="flex gap-3 items-start"><span className="text-2xl">🀄</span><div><p className="font-bold text-[#333]">Sorteo por Quiniela Nacional Nocturna</p><p className="text-gray-500">Cuando se vendan los 100 números, usa el botón "SORTEO QUINIELA NOCTURNA (21HS)". El ganador se define con las últimas 2 cifras de la cabeza del sorteo Nocturna (21hs) de la Quiniela Nacional. El sorteo debe realizarse después de las 21hs. 100% transparente.</p></div></div>
          </div>
        </div>
      </main>

      <div className="max-w-2xl mx-auto px-4 mb-4">
        <div className="flex gap-2">
          <button onClick={manualRefresh} className="flex-1 bg-white text-[#333] py-2 rounded-lg font-bold text-sm border border-[#EBEBEB] shadow-sm">🔄 Actualizar datos</button>
          <button onClick={() => setShowDebug(!showDebug)} className={`flex-1 py-2 rounded-lg font-bold text-sm ${showDebug ? 'bg-red-500 text-white' : 'bg-[#111111] text-white'} shadow-sm`}>🐛 DEBUG {showDebug ? 'OCULTAR' : 'MOSTRAR'}</button>
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
                    <p className="font-bold text-[#111827]">{prod.title || prod.nombre} ({prodBoletos.length} boletos)</p>
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
            <p className="text-5xl font-black text-[#25F4EE] my-4">#{String(showConfirmModal.numero).padStart(2,'0')}</p>
            <p className="text-xl font-bold text-[#333]">{showConfirmModal.nombre}</p>
            <p className="text-gray-500 mb-6">{showConfirmModal.whatsapp}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(null)} className="flex-1 py-3 rounded-lg font-bold bg-gray-100 text-[#333] border border-[#EBEBEB]">Cancelar</button>
              <button onClick={() => confirmarVenta(showConfirmModal)} className="flex-1 py-3 rounded-lg font-bold bg-[#39B54A] text-white shadow-sm">Confirmar ✅</button>
            </div>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditForm(null)}></div>
          <div className="relative w-full max-w-lg rounded-lg p-6 bg-white border border-[#EBEBEB] shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-[#333]">✏️ EDITAR RIFA</h2>
              <button onClick={() => setShowEditForm(null)} className="text-2xl text-[#333]">✕</button>
            </div>
            <form onSubmit={actualizarProducto} className="space-y-3">
              <input placeholder="Titulo del producto *" required value={showEditForm.title} onChange={e => setShowEditForm({...showEditForm, title: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Precio original (ARS)" type="number" value={showEditForm.price} onChange={e => setShowEditForm({...showEditForm, price: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" />
                <input placeholder="Precio rifa (ARS) *" type="number" required value={showEditForm.raffle_price} onChange={e => setShowEditForm({...showEditForm, raffle_price: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" />
              </div>
              <textarea placeholder="Descripcion del producto (opcional)" value={showEditForm.description || ''} onChange={e => setShowEditForm({...showEditForm, description: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]" rows="2" />
              <select value={showEditForm.categoria_id} onChange={e => setShowEditForm({...showEditForm, categoria_id: e.target.value})} className="w-full rounded-lg p-3 font-bold bg-white border border-[#EBEBEB] text-[#333]">
                <option value="">Selecciona categoria (opcional)</option>
                {categorias.map(c => {
                  const emoji = c.nombre === 'Tecnología' || c.nombre === 'Tecnologia' ? '💻' : c.nombre === 'Indumentaria' ? '👕' : c.nombre === 'Hogar' ? '🏠' : '🎁';
                  return <option key={c.id} value={c.id}>{emoji} {c.nombre}</option>;
                })}
              </select>
              <div>
                <label className="text-sm font-bold block mb-2 text-[#333]">Imagen del producto</label>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="relative">
                      {showEditForm.images[i] ? (
                        <div className="relative">
                          <img src={showEditForm.images[i]} alt={`Foto ${i + 1}`} className="w-full h-28 object-cover rounded-lg border border-[#EBEBEB]" />
                          <button type="button" onClick={() => { const newImages = [...showEditForm.images]; newImages[i] = ''; setShowEditForm({...showEditForm, images: newImages}); }} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center">✕</button>
                        </div>
                      ) : (
                        <div className="w-full h-28 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-white">
                          <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                            <span className="text-2xl">📷</span>
                            <span className="text-[10px] text-gray-400 mt-1">Foto {i + 1}</span>
                            <input type="file" accept="image/*" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fd = new FormData();
                              fd.append('image', file);
                              const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
                              const data = await res.json();
                              if (data.url) {
                                const newImages = [...showEditForm.images];
                                newImages[i] = data.url;
                                setShowEditForm({...showEditForm, images: newImages});
                              }
                            }} className="hidden" />
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditForm(null)} className="flex-1 py-3 rounded-lg font-bold bg-gray-100 text-[#333] border border-[#EBEBEB]">Cancelar</button>
                <button disabled={loading} className="flex-1 py-3 rounded-lg font-bold bg-[#3483FA] text-white shadow-sm disabled:opacity-60">{loading ? '⏳' : '💾 Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSorteoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSorteoModal(null)}></div>
          <div className="relative w-full max-w-md rounded-lg p-6 text-center bg-white border border-[#EBEBEB] shadow-lg">
            <div className="text-6xl mb-4">🎰</div>
            <h2 className="text-2xl font-black text-[#111827]">REALIZAR SORTEO</h2>
            <p className="text-lg font-bold mt-4 text-[#333]">{showSorteoModal.title || showSorteoModal.nombre}</p>
            <p className="text-[#39B54A] font-black text-xl">${(showSorteoModal.raffle_price || 0).toLocaleString('es-AR')}-</p>
            <div className="mt-4 p-4 rounded-lg bg-[#111827]/10 border border-[#25F4EE]/30">
              <p className="font-bold text-sm text-[#333]">Método de sorteo:</p>
              <p className="text-lg font-black text-[#25F4EE]">🀄 QUINIELA NACIONAL NOCTURNA</p>
              <p className="text-xs text-gray-500 mt-1">Se usan las últimas 2 cifras de la cabeza de la Quiniela Nacional Nocturna (sorteo de las 21hs). 100% transparente.</p>
            </div>
            {showSorteoResult && (
              <div className={`mt-4 p-4 rounded-lg ${showSorteoResult.success ? 'bg-[#39B54A]/10 border border-[#39B54A]/30' : 'bg-red-50 border border-red-200'}`}>
                {showSorteoResult.success ? (
                  <>
                    <span className="text-5xl block mb-2 animate-bounce">🎊</span>
                    <p className="text-2xl font-black text-[#39B54A]">GANADOR!</p>
                    <p className="text-6xl font-black text-[#25F4EE] my-2">#{String(showSorteoResult.ganador.numero).padStart(2,'0')}</p>
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
                        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#25F4EE', '#3483FA', '#39B54A'] });
                      }
                    } catch (err) {
                      setShowSorteoResult({ success: false, error: 'Error de conexion' });
                    }
                    setSorteando(false);
                  }}
                  disabled={sorteando}
                  className="flex-1 py-3 rounded-lg font-bold bg-[#111827] text-[#333] shadow-sm disabled:opacity-50 hover:bg-[#f0d800] transition-colors"
                >
                  {sorteando ? '⏳ SORTEANDO...' : '🎰 SORTEAR'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showPagoDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPagoDetail(null)}></div>
          <div className="relative w-full max-w-sm rounded-lg p-6 bg-white border border-[#EBEBEB] shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-[#333]">💳 DETALLE PAGO</h2>
              <button onClick={() => setShowPagoDetail(null)} className="text-2xl text-[#333]">✕</button>
            </div>
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-5xl font-black text-[#333]">#{String(showPagoDetail.numero).padStart(2,'0')}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-gray-400">Nombre</p><p className="font-bold text-[#333]">{showPagoDetail.nombre || '-'}</p></div>
                <div><p className="text-gray-400">WhatsApp</p><p className="font-bold text-[#333]">{showPagoDetail.whatsapp || '-'}</p></div>
                <div><p className="text-gray-400">Monto</p><p className="font-bold text-[#39B54A]">${parseFloat(showPagoDetail.monto || 0).toLocaleString('es-AR')}-</p></div>
                <div><p className="text-gray-400">Alias usado</p><p className="font-bold text-[#3483FA]">{showPagoDetail.alias_usado || '-'}</p></div>
                <div><p className="text-gray-400">Estado</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    showPagoDetail.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                    showPagoDetail.estado === 'confirmado' ? 'bg-green-100 text-green-700' :
                    'bg-gray-200 text-gray-500'
                  }`}>{showPagoDetail.estado}</span>
                </div>
                <div><p className="text-gray-400">Fecha</p><p className="font-bold text-[#333] text-xs">{new Date(showPagoDetail.created_at).toLocaleString('es-AR')}</p></div>
              </div>
              {showPagoDetail.comprobante_url && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Comprobante:</p>
                  <a href={showPagoDetail.comprobante_url} target="_blank" rel="noopener noreferrer">
                    <img src={showPagoDetail.comprobante_url} alt="Comprobante" className="w-full rounded-lg border border-[#EBEBEB] max-h-60 object-contain bg-gray-50" />
                  </a>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {showPagoDetail.estado === 'pendiente' && (
                  <>
                    <button onClick={async () => {
                      const res = await fetch('/api/pagos', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: showPagoDetail.id, estado: 'confirmado' })
                      });
                      const result = await res.json();
                      if (result.success) { setShowPagoDetail(null); setRefreshKey(k => k + 1); setNotif('✅ Pago confirmado!'); }
                      else alert('Error: ' + result.error);
                    }} className="flex-1 bg-[#39B54A] text-white py-3 rounded-lg font-bold text-sm">✅ Confirmar</button>
                    <button onClick={async () => {
                      const res = await fetch('/api/pagos', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: showPagoDetail.id, estado: 'cancelado' })
                      });
                      const result = await res.json();
                      if (result.success) { setShowPagoDetail(null); setRefreshKey(k => k + 1); setNotif('❌ Pago cancelado'); }
                      else alert('Error: ' + result.error);
                    }} className="bg-red-500 text-white px-4 py-3 rounded-lg font-bold text-sm">❌</button>
                  </>
                )}
                <button onClick={() => setShowPagoDetail(null)} className={`py-3 rounded-lg font-bold text-sm ${showPagoDetail.estado === 'pendiente' ? 'flex-1 bg-gray-100 text-[#333] border border-[#EBEBEB]' : 'w-full bg-gray-100 text-[#333] border border-[#EBEBEB]'}`}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNotifModal(null)}></div>
          <div className="relative w-full max-w-md rounded-lg p-6 bg-white border border-[#EBEBEB] shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <span className="text-5xl block mb-2 animate-bounce">🏆</span>
              <h2 className="text-2xl font-black text-[#111827]">SORTEO COMPLETADO</h2>
              <p className="text-5xl font-black text-[#25F4EE] my-2">#{String(showNotifModal.ganador.numero).padStart(2,'0')}</p>
              <p className="text-xl font-bold text-[#333]">{showNotifModal.ganador.nombre}</p>
              <p className="text-sm text-gray-500 mt-1">🎁 {showNotifModal.producto?.title || showNotifModal.producto?.nombre}</p>
            </div>

            {showNotifModal.productosActivos?.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-[#FE2C55]/10 to-[#25F4EE]/10 border border-[#FE2C55]/30">
                <h3 className="font-black text-[#FE2C55] mb-2">🔥 SEGUÍ PARTICIPANDO</h3>
                <p className="text-sm text-gray-600 mb-3">No ganaste esta vez, pero seguís teniendo chances en otras rifas:</p>
                <div className="space-y-2">
                  {showNotifModal.productosActivos.map(p => (
                    <a key={p.id}
                      href={`${process.env.NEXT_PUBLIC_BASE_URL || window.location.origin}/app?producto=${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 rounded-lg bg-white border border-[#EBEBEB] hover:border-[#FE2C55] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {p.images?.[0] && <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#333] truncate">{p.title || p.nombre}</p>
                          <p className="text-[#FE2C55] font-black text-xs">${(p.raffle_price || 0).toLocaleString('es-AR')}- por número</p>
                        </div>
                        <span className="text-[#25F4EE] text-xl">→</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 p-4 rounded-lg bg-[#F5F5F5] border border-[#EBEBEB]">
              <h3 className="font-bold text-sm text-[#333] mb-2">📋 Notificar a los que no ganaron</h3>
              <textarea readOnly rows="4"
                className="w-full text-xs p-3 rounded border border-[#EBEBEB] bg-white text-[#333] font-mono resize-none"
                value={
                  showNotifModal.participantes.length > 0
                    ? showNotifModal.participantes.map(p =>
                      `📱 wa.me/${p.whatsapp}?text=${encodeURIComponent(
                        `🎰 SORTEO REALIZADO - Eco Rifas\n\nEl sorteo ya se realizó mediante la Quiniela Nacional Nocturna.\n\n🏆 Ganador: #${String(showNotifModal.ganador.numero).padStart(2,'0')} - ${showNotifModal.ganador.nombre}\n\n😢 No fue tu número... ¡PERO SEGUÍ PARTICIPANDO!\n\n${showNotifModal.productosActivos?.length > 0 ? '🔥 Hay otras rifas activas esperando por vos: ' + (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin) + '/app\n\n' : ''}🍀 Suerte la próxima!`
                      )}`
                    ).join('\n\n')
                    : 'No hay participantes con WhatsApp para notificar.'
                }
              />
              <button
                onClick={() => {
                  const texto = showNotifModal.participantes.map(p =>
                    `wa.me/${p.whatsapp}?text=${encodeURIComponent(
                      `🎰 SORTEO REALIZADO - Eco Rifas\n\nEl sorteo ya se realizó mediante la Quiniela Nacional Nocturna.\n\n🏆 Ganador: #${String(showNotifModal.ganador.numero).padStart(2,'0')} - ${showNotifModal.ganador.nombre}\n\n😢 No fue tu número... ¡PERO SEGUÍ PARTICIPANDO!\n\n${showNotifModal.productosActivos?.length > 0 ? '🔥 Hay otras rifas activas esperando por vos: ' + (process.env.NEXT_PUBLIC_BASE_URL || window.location.origin) + '/app\n\n' : ''}🍀 Suerte la próxima!`
                    )}`
                  ).join('\n\n');
                  navigator.clipboard.writeText(texto);
                  setNotif('✅ Links copiados! Pegalos en WhatsApp');
                }}
                className="mt-2 w-full py-2 rounded-lg font-bold text-sm bg-[#111827] text-white shadow-sm hover:bg-[#333] transition-colors"
              >
                📋 COPIAR LINKS PARA NO GANADORES
              </button>
            </div>

            {showNotifModal.ganador.whatsapp && (
              <button
                onClick={() => abrirWhatsAppNumero(showNotifModal.ganador.whatsapp,
                  generarMensajeGanador(showNotifModal.ganador, showNotifModal.producto)
                )}
                className="mt-3 w-full py-3 rounded-lg font-bold bg-[#39B54A] text-white shadow-sm hover:bg-[#2d9e3d] transition-colors"
              >
                📲 CONTACTAR GANADOR
              </button>
            )}

            <button
              onClick={() => { setShowNotifModal(null); fetchData(); }}
              className="mt-3 w-full py-3 rounded-lg font-bold bg-gray-100 text-[#333] border border-[#EBEBEB] hover:bg-gray-200 transition-colors"
            >
              CERRAR ✅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
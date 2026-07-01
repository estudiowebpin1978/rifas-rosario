'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const CATEGORIAS = [
  'Tecnología', 'Electrodomesticos', 'Celulares', 'Hogar y Muebles',
  'Herramientas', 'Deportes', 'Zapatillas', 'Indumentaria',
  'Juegos y Juguetes', 'Belleza', 'Bazar', 'Servicios', 'Otros'
];

const CATEGORY_EMOJI = {
  'Tecnología': '💻', 'Electrodomesticos': '🏠', 'Celulares': '📱',
  'Hogar y Muebles': '🛋️', 'Herramientas': '🔧', 'Deportes': '🎲',
  'Zapatillas': '👟', 'Indumentaria': '👕', 'Juegos y Juguetes': '🎮',
  'Belleza': '💄', 'Bazar': '🍽️', 'Servicios': '📋', 'Otros': '📦',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateRifa, setShowCreateRifa] = useState(false);
  const [showConnectUala, setShowConnectUala] = useState(false);
  const [activeTab, setActiveTab] = useState('rifas');
  const [orgForm, setOrgForm] = useState({ nombre: '', descripcion: '', whatsapp: '', ciudad: '' });
  const [rifaForm, setRifaForm] = useState({ nombre: '', precio: '', categoria_id: '', numbers_total: '100', imagen: '', descripcion: '' });
  const [ualaForm, setUalaForm] = useState({ username: '', client_id: '', client_secret: '' });
  const [creating, setCreating] = useState(false);
  const WHATSAPP = '5493412500029';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) { router.push('/'); return; }
      setUser(data.session.user);
      loadOrg(data.session.user.id);
    });
  }, []);

  const loadOrg = async (userId) => {
    try {
      const res = await fetch('/api/organizaciones');
      const data = await res.json();
      const myOrg = data.organizaciones?.find(o => o.user_id === userId);
      if (myOrg) {
        setOrg(myOrg);
        const orgRes = await fetch(`/api/organizaciones/${myOrg.slug}`);
        const orgData = await orgRes.json();
        setProductos(orgData.productos || []);
      } else {
        setShowCreateOrg(true);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const createOrg = async (e) => {
    e.preventDefault();
    if (!user) return;
    const res = await fetch('/api/organizaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, ...orgForm }),
    });
    const data = await res.json();
    if (data.success) {
      setOrg(data.organizacion);
      setShowCreateOrg(false);
    } else {
      alert(data.error || 'Error al crear organización');
    }
  };

  const createRifa = async (e) => {
    e.preventDefault();
    if (!org || !rifaForm.nombre || !rifaForm.precio) return;
    setCreating(true);
    try {
      const res = await fetch('/api/crear-producto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: rifaForm.nombre,
          descripcion: rifaForm.descripcion,
          imagen: rifaForm.imagen || null,
          precio: rifaForm.precio,
          categoria_id: rifaForm.categoria_id || null,
          numbers_total: rifaForm.numbers_total || 100,
          organization_id: org.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateRifa(false);
        setRifaForm({ nombre: '', precio: '', categoria_id: '', numbers_total: '100', imagen: '', descripcion: '' });
        loadOrg(user.id);
      } else {
        alert(data.error || 'Error al crear rifa');
      }
    } catch (e) {
      alert('Error de conexión');
    }
    setCreating(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const connectUala = async (e) => {
    e.preventDefault();
    if (!org || !ualaForm.username || !ualaForm.client_id || !ualaForm.client_secret) return;
    setCreating(true);
    try {
      const { error } = await supabase
        .from('organizaciones')
        .update({
          uala_username: ualaForm.username,
          uala_client_id: ualaForm.client_id,
          uala_client_secret: ualaForm.client_secret,
          uala_connected: true,
        })
        .eq('id', org.id);
      if (error) throw error;
      setOrg({ ...org, uala_connected: true, uala_username: ualaForm.username });
      setShowConnectUala(false);
      setUalaForm({ username: '', client_id: '', client_secret: '' });
      alert('✅ Uala conectada correctamente!');
    } catch (e) {
      alert('Error al conectar: ' + e.message);
    }
    setCreating(false);
  };

  const disconnectUala = async () => {
    if (!confirm('Desconectar Uala?')) return;
    const { error } = await supabase
      .from('organizaciones')
      .update({ uala_connected: false, uala_username: null, uala_client_id: null, uala_client_secret: null })
      .eq('id', org.id);
    if (!error) {
      setOrg({ ...org, uala_connected: false });
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/organization/${org?.slug}`;
    navigator.clipboard.writeText(link);
    alert('Link copiado!');
  };

  const shareWhatsApp = () => {
    const link = `${window.location.origin}/organization/${org?.slug}`;
    window.open(`https://wa.me/?text=${encodeURIComponent('¡Mirá mis rifas! 🎉 ' + link)}`, '_blank');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">⚙️</div>
        <p className="font-bold text-[#333]">Cargando dashboard...</p>
      </div>
    </div>
  );

  const totalVendidos = productos.reduce((acc, p) => {
    const total = p.boletos_count || 100;
    const sold = p.vendidos || 0;
    return acc + sold;
  }, 0);

  const totalRecaudado = productos.reduce((acc, p) => {
    const sold = p.vendidos || 0;
    const precio = p.raffle_price || 0;
    return acc + (sold * precio);
  }, 0);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-[#111827] border-b border-gray-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Eco Rifas" className="w-10 h-10" />
            <div>
              <h1 className="text-lg font-black text-[#FE2C55]">DASHBOARD</h1>
              <p className="text-[10px] text-gray-400">{org?.nombre || 'Sin organización'}</p>
            </div>
          </div>
          <button onClick={logout} className="text-gray-400 text-sm font-bold">Salir</button>
        </div>
      </header>

      {showCreateOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl border border-[#EBEBEB]">
            <h2 className="text-2xl font-black text-[#111827] mb-2">🚀 Creá tu organización</h2>
            <p className="text-sm text-gray-500 mb-4">Empezá a organizar rifas en 2 minutos</p>
            <form onSubmit={createOrg} className="space-y-3">
              <input placeholder="Nombre de tu organización" required value={orgForm.nombre} onChange={e => setOrgForm({...orgForm, nombre: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" />
              <textarea placeholder="Descripción (opcional)" value={orgForm.descripcion} onChange={e => setOrgForm({...orgForm, descripcion: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" rows="2" />
              <input placeholder="WhatsApp (ej: 5493412500029)" value={orgForm.whatsapp} onChange={e => setOrgForm({...orgForm, whatsapp: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" />
              <input placeholder="Ciudad (ej: Rosario)" value={orgForm.ciudad} onChange={e => setOrgForm({...orgForm, ciudad: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" />
              <button type="submit" className="w-full py-3 rounded-xl font-black text-lg bg-gradient-to-r from-[#FE2C55] to-[#C12045] text-white shadow-lg">✨ CREAR ORGANIZACIÓN</button>
            </form>
          </div>
        </div>
      )}

      {showCreateRifa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateRifa(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl border border-[#EBEBEB] max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-[#111827] mb-2">🎰 Crear nueva rifa</h2>
            <p className="text-sm text-gray-500 mb-4">Completá los datos de tu rifa</p>
            <form onSubmit={createRifa} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Nombre del producto *</label>
                <input placeholder="Ej: Samsung Galaxy A54" required value={rifaForm.nombre} onChange={e => setRifaForm({...rifaForm, nombre: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Precio por número *</label>
                <input type="number" placeholder="Ej: 500" required value={rifaForm.precio} onChange={e => setRifaForm({...rifaForm, precio: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Categoría</label>
                <select value={rifaForm.categoria_id} onChange={e => setRifaForm({...rifaForm, categoria_id: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none">
                  <option value="">Seleccionar categoría</option>
                  {CATEGORIAS.map((c, i) => (
                    <option key={i} value={i + 2}>{CATEGORY_EMOJI[c]} {c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Cantidad de números</label>
                <input type="number" placeholder="100" value={rifaForm.numbers_total} onChange={e => setRifaForm({...rifaForm, numbers_total: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">URL de imagen (opcional)</label>
                <input placeholder="https://..." value={rifaForm.imagen} onChange={e => setRifaForm({...rifaForm, imagen: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Descripción (opcional)</label>
                <textarea placeholder="Describí tu producto..." value={rifaForm.descripcion} onChange={e => setRifaForm({...rifaForm, descripcion: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" rows="2" />
              </div>
              <button type="submit" disabled={creating} className="w-full py-3 rounded-xl font-black text-lg bg-gradient-to-r from-[#FE2C55] to-[#C12045] text-white shadow-lg disabled:opacity-50">
                {creating ? '⏳ CREANDO...' : '✨ CREAR RIFA'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showConnectUala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConnectUala(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl border border-[#EBEBEB]">
            <h2 className="text-2xl font-black text-[#111827] mb-2">💳 Conectar Uala</h2>
            <p className="text-sm text-gray-500 mb-4">Los pagos van directo a tu cuenta</p>
            <form onSubmit={connectUala} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Username de Uala *</label>
                <input placeholder="Ej: miusuario123" required value={ualaForm.username} onChange={e => setUalaForm({...ualaForm, username: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#6C2DC7] outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Client ID *</label>
                <input placeholder="Tu Client ID de Uala" required value={ualaForm.client_id} onChange={e => setUalaForm({...ualaForm, client_id: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#6C2DC7] outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Client Secret *</label>
                <input type="password" placeholder="Tu Client Secret de Uala" required value={ualaForm.client_secret} onChange={e => setUalaForm({...ualaForm, client_secret: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#6C2DC7] outline-none" />
              </div>
              <div className="bg-[#6C2DC7]/10 rounded-xl p-4">
                <p className="text-xs text-[#333]">🔒 Tus credenciales se guardan de forma segura y solo se usan para procesar pagos de tus rifas.</p>
              </div>
              <button type="submit" disabled={creating} className="w-full py-3 rounded-xl font-black text-lg bg-[#6C2DC7] text-white shadow-lg disabled:opacity-50">
                {creating ? '⏳ CONECTANDO...' : '💳 CONECTAR UALA'}
              </button>
            </form>
            <button onClick={() => setShowConnectUala(false)} className="w-full mt-3 py-3 font-bold text-gray-400 hover:text-black transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {org && (
          <>
            <div className="bg-gradient-to-r from-[#FE2C55] to-[#C12045] rounded-2xl p-5 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-black">
                  {org.nombre?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-black">{org.nombre}</h2>
                  <p className="text-sm opacity-80">{org.ciudad || 'Argentina'} · Plan {org.plan?.toUpperCase()}</p>
                  <p className="text-xs opacity-60 mt-1">/{org.slug}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={copyLink} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">📋 Copiar link</button>
                  <button onClick={shareWhatsApp} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">💬 Compartir</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">{productos.length}</p>
                  <p className="text-[10px] opacity-70">Rifas</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">${totalRecaudado.toLocaleString('es-AR')}</p>
                  <p className="text-[10px] opacity-70">Recaudado</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">{org.commission_pct || 15}%</p>
                  <p className="text-[10px] opacity-70">Comisión</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 bg-white rounded-xl p-1 border border-[#EBEBEB]">
              {['rifas', 'pagos', 'uala'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === tab ? 'bg-[#111827] text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {tab === 'rifas' ? '🎰 Mis Rifas' : tab === 'pagos' ? '💰 Comisiones' : '💳 Mi Uala'}
                </button>
              ))}
            </div>

            {activeTab === 'rifas' && (
              <div className="space-y-3">
                <button onClick={() => setShowCreateRifa(true)} className="w-full py-3 rounded-xl font-black text-white bg-gradient-to-r from-[#FE2C55] to-[#C12045] shadow-lg hover:shadow-xl transition-all">
                  + CREAR NUEVA RIFA
                </button>
                {productos.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-[#EBEBEB]">
                    <p className="text-4xl mb-3">🎰</p>
                    <p className="font-bold text-[#333]">Sin rifas creadas</p>
                    <p className="text-sm text-gray-500 mt-1">Creá tu primera rifa para empezar a recaudar</p>
                  </div>
                ) : (
                  productos.map(p => {
                    const total = p.boletos_count || 100;
                    const sold = p.vendidos || 0;
                    const pct = Math.round((sold / total) * 100);
                    return (
                      <div key={p.id} className="bg-white rounded-xl p-4 border border-[#EBEBEB]">
                        <div className="flex items-center gap-3">
                          <img src={p.imagen || '/logo.png'} alt="" className="w-14 h-14 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-[#333] truncate">{p.title || p.nombre}</p>
                            <p className="text-xs text-gray-500">{p.precio} · {p.categorias?.nombre || 'Sin categoría'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${p.finalizado ? 'bg-gray-100 text-gray-400' : 'bg-[#39B54A]/10 text-[#39B54A]'}`}>
                            {p.finalizado ? 'Finalizada' : 'Activa'}
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>{sold}/{total} vendidos</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#39B54A] to-[#2d8a3a] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'pagos' && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-6 border border-[#EBEBEB]">
                  <h3 className="font-black text-lg text-[#333] mb-3">💰 Comisión de la plataforma</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Total recaudado</span>
                      <span className="font-black text-[#39B54A]">${totalRecaudado.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Comisión ({org.commission_pct || 15}%)</span>
                      <span className="font-black text-[#FE2C55]">-${Math.round(totalRecaudado * (org.commission_pct || 15) / 100).toLocaleString('es-AR')}</span>
                    </div>
                    <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                      <span className="text-sm font-bold text-[#333]">Neto para vos</span>
                      <span className="text-xl font-black text-[#39B54A]">${Math.round(totalRecaudado * (1 - (org.commission_pct || 15) / 100)).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-[#EBEBEB]">
                  <h3 className="font-black text-lg text-[#333] mb-2">📋 Cómo funciona</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>1. Conectás tu cuenta Uala</p>
                    <p>2. Creás tu rifa y compartís el link</p>
                    <p>3. Los participantes pagan vía Uala → va directo a tu cuenta</p>
                    <p>4. La comisión se registra automáticamente</p>
                    <p>5. Nos transferís la comisión cuando quieras</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'uala' && (
              <div className="space-y-3">
                {org.uala_connected ? (
                  <div className="bg-white rounded-2xl p-6 border border-[#EBEBEB]">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[#6C2DC7]/10 flex items-center justify-center text-2xl">💳</div>
                      <div>
                        <p className="font-black text-[#333]">Uala Conectada</p>
                        <p className="text-sm text-[#39B54A] font-bold">✅ Activa</p>
                      </div>
                    </div>
                    <div className="bg-[#F5F5F5] rounded-xl p-4 mb-4">
                      <p className="text-xs text-gray-500 mb-1">Tu usuario Uala</p>
                      <p className="font-bold text-[#333]">{org.uala_username}</p>
                    </div>
                    <div className="bg-[#39B54A]/10 rounded-xl p-4 mb-4">
                      <p className="text-sm text-[#333]">Los pagos van directo a tu cuenta Uala. La plataforma solo registra la comisión.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowConnectUala(true)} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">✏️ Editar credenciales</button>
                      <button onClick={disconnectUala} className="py-3 px-4 rounded-xl font-bold bg-[#FE2C55]/10 text-[#FE2C55] hover:bg-[#FE2C55]/20 transition-colors">🔌 Desconectar</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-6 border border-[#EBEBEB] text-center">
                    <div className="text-5xl mb-4">💳</div>
                    <p className="font-black text-[#333] text-lg mb-2">Conectá tu Uala</p>
                    <p className="text-sm text-gray-500 mb-6">Así los participantes pagan directo a tu cuenta</p>
                    <button onClick={() => setShowConnectUala(true)} className="w-full py-3 rounded-xl font-black text-white bg-[#6C2DC7] hover:bg-[#5a24b0] transition-all shadow-lg">
                      💳 CONECTAR MI UALA
                    </button>
                    <div className="mt-6 bg-[#F5F5F5] rounded-xl p-4 text-left">
                      <p className="font-bold text-sm text-[#333] mb-2">📋 Necesitás tener:</p>
                      <ul className="space-y-1 text-xs text-gray-600">
                        <li>✅ Cuenta Uala (gratis)</li>
                        <li>✅ Cuenta de desarrollador en Uala</li>
                        <li>✅ Client ID y Client Secret</li>
                      </ul>
                      <a href="https://developers.ar.ua.la/" target="_blank" className="mt-3 inline-block text-xs text-[#6C2DC7] font-bold hover:underline">Crear cuenta de desarrollador →</a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

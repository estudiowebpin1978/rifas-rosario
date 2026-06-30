'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [productos, setProductos] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({ nombre: '', descripcion: '', whatsapp: '', ciudad: '' });
  const [activeTab, setActiveTab] = useState('rifas');
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

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-spin">⚙️</div>
        <p className="font-bold text-[#333]">Cargando dashboard...</p>
      </div>
    </div>
  );

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
              <input placeholder="WhatsApp (opcional)" value={orgForm.whatsapp} onChange={e => setOrgForm({...orgForm, whatsapp: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" />
              <input placeholder="Ciudad (opcional)" value={orgForm.ciudad} onChange={e => setOrgForm({...orgForm, ciudad: e.target.value})} className="w-full rounded-xl p-3 font-bold bg-white border border-[#EBEBEB] text-[#333] focus:border-[#FE2C55] outline-none" />
              <button type="submit" className="w-full btn-3d-pink font-black text-lg">✨ CREAR ORGANIZACIÓN</button>
            </form>
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
                <div>
                  <h2 className="text-xl font-black">{org.nombre}</h2>
                  <p className="text-sm opacity-80">{org.ciudad || 'Argentina'} · Plan {org.plan?.toUpperCase()}</p>
                  <p className="text-xs opacity-60 mt-1">/{org.slug}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">{org.total_rifas || 0}</p>
                  <p className="text-[10px] opacity-70">Rifas</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">${(org.total_recaudado || 0).toLocaleString('es-AR')}</p>
                  <p className="text-[10px] opacity-70">Recaudado</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black">{org.commission_pct || 8}%</p>
                  <p className="text-[10px] opacity-70">Comisión</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 bg-white rounded-xl p-1 border border-[#EBEBEB]">
              {['rifas', 'ganadores', 'pagos'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === tab ? 'bg-[#111827] text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                  {tab === 'rifas' ? '🎰 Rifas' : tab === 'ganadores' ? '🏆 Ganadores' : '💰 Pagos'}
                </button>
              ))}
            </div>

            {activeTab === 'rifas' && (
              <div className="space-y-3">
                <a href="/app" className="block w-full btn-3d-pink text-center">+ Crear nueva rifa</a>
                {productos.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center border border-[#EBEBEB]">
                    <p className="text-4xl mb-3">🎰</p>
                    <p className="font-bold text-[#333]">Sin rifas creadas</p>
                    <p className="text-sm text-gray-500 mt-1">Creá tu primera rifa para empezar a recaudar</p>
                  </div>
                ) : (
                  productos.map(p => (
                    <div key={p.id} className="bg-white rounded-xl p-4 border border-[#EBEBEB] flex items-center gap-3">
                      <img src={p.imagen || '/logo.png'} alt="" className="w-14 h-14 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#333] truncate">{p.title || p.nombre}</p>
                        <p className="text-xs text-gray-500">{p.precio} · {p.categorias?.nombre || 'Sin categoría'}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${p.finalizado ? 'bg-gray-100 text-gray-400' : 'bg-[#39B54A]/10 text-[#39B54A]'}`}>
                        {p.finalizado ? 'Finalizada' : 'Activa'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'ganadores' && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-8 text-center border border-[#EBEBEB]">
                  <p className="text-4xl mb-3">🏆</p>
                  <p className="font-bold text-[#333]">Ganadores verificados</p>
                  <p className="text-sm text-gray-500 mt-1">Cuando finalices una rifa, podrás subir fotos y testimonios de ganadores reales</p>
                </div>
              </div>
            )}

            {activeTab === 'pagos' && (
              <div className="space-y-3">
                <div className="bg-white rounded-2xl p-6 border border-[#EBEBEB]">
                  <h3 className="font-black text-lg text-[#333] mb-3">💰 Tu saldo</h3>
                  <p className="text-3xl font-black text-[#39B54A]">$0</p>
                  <p className="text-xs text-gray-500 mt-1">Disponible para retirar</p>
                  <button className="w-full mt-4 py-3 rounded-xl font-bold bg-gray-100 text-gray-400 cursor-not-allowed">Retirar (próximamente)</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

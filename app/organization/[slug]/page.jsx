'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function OrganizationPage() {
  const params = useParams();
  const [org, setOrg] = useState(null);
  const [productos, setProductos] = useState([]);
  const [ganadores, setGanadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('rifas');

  useEffect(() => {
    if (!params.slug) return;
    fetch(`/api/organizaciones/${params.slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setOrg(d.organizacion);
        setProductos(d.productos || []);
        setGanadores(d.ganadores || []);
      })
      .catch(e => setError('Error al cargar'))
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl animate-spin">⚙️</div>
        <p className="mt-4 font-bold text-gray-500">Cargando organización...</p>
      </div>
    </div>
  );

  if (error || !org) return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-4">
      <div className="text-center bg-white rounded-2xl p-8 border border-[#EBEBEB]">
        <p className="text-4xl mb-3">😕</p>
        <p className="font-bold text-[#333]">{error || 'Organización no encontrada'}</p>
        <a href="/marketplace" className="inline-block mt-4 px-6 py-2 rounded-xl font-bold bg-[#FE2C55] text-white">Volver al marketplace</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <header className="relative">
        <div className="h-40 bg-gradient-to-r from-[#FE2C55] to-[#C12045]" />
        <div className="max-w-lg mx-auto px-4 -mt-12 relative z-10">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl font-black text-[#FE2C55] overflow-hidden">
              {org.logo_url ? <img src={org.logo_url} alt="" className="w-24 h-24 object-cover" /> : org.nombre?.charAt(0)}
            </div>
            <div className="pb-2">
              <h1 className="text-2xl font-black text-[#333]">{org.nombre}</h1>
              <p className="text-sm text-gray-500">{org.ciudad || 'Argentina'} · {org.total_rifas || 0} rifas</p>
            </div>
          </div>
          {org.descripcion && <p className="mt-4 text-sm text-gray-600">{org.descripcion}</p>}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2 bg-white rounded-xl p-1 border border-[#EBEBEB]">
          <button onClick={() => setActiveTab('rifas')} className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'rifas' ? 'bg-[#111827] text-white shadow' : 'text-gray-500'}`}>
            🎰 Rifas activas ({productos.length})
          </button>
          <button onClick={() => setActiveTab('ganadores')} className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'ganadores' ? 'bg-[#111827] text-white shadow' : 'text-gray-500'}`}>
            🏆 Ganadores ({ganadores.length})
          </button>
        </div>

        {activeTab === 'rifas' && (
          <div className="space-y-3">
            {productos.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#EBEBEB]">
                <p className="text-4xl mb-3">🎰</p>
                <p className="font-bold text-[#333]">Sin rifas activas</p>
              </div>
            ) : productos.map(p => (
              <a key={p.id} href={`/app?rifa=${p.id}`} className="block bg-white rounded-2xl p-4 border border-[#EBEBEB] hover:shadow-lg transition-all">
                <div className="flex gap-3">
                  <img src={p.imagen || '/logo.png'} alt="" className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-[#333] truncate">{p.title || p.nombre}</h3>
                    <p className="text-[#39B54A] font-black mt-1">{p.precio}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.categorias?.nombre || ''}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {activeTab === 'ganadores' && (
          <div className="space-y-3">
            {ganadores.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-[#EBEBEB]">
                <p className="text-4xl mb-3">🏆</p>
                <p className="font-bold text-[#333]">Aún no hay ganadores</p>
              </div>
            ) : ganadores.map(g => (
              <div key={g.id} className="bg-white rounded-2xl p-4 border border-[#EBEBEB]">
                <div className="flex items-center gap-3">
                  {g.ganador_foto ? (
                    <img src={g.ganador_foto} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-[#39B54A]" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#39B54A] to-[#2d9e3d] flex items-center justify-center text-white text-xl font-black">🏆</div>
                  )}
                  <div className="flex-1">
                    <p className="font-black text-[#333]">{g.ganador_nombre || 'Anónimo'}</p>
                    <p className="text-sm text-gray-500">{g.title || g.nombre}</p>
                    {g.ganador_ciudad && <p className="text-xs text-gray-400">📍 {g.ganador_ciudad}</p>}
                    {g.ganador_testimonio && <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{g.ganador_testimonio}&rdquo;</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[#39B54A]">#{String(g.ganador_num).padStart(2, '0')}</p>
                    <p className="text-[10px] text-gray-400">ganador</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {org.whatsapp && (
          <a href={`https://wa.me/${org.whatsapp}`} target="_blank" className="block w-full py-4 rounded-2xl bg-[#39B54A] text-white font-black text-center text-lg shadow-lg">
            💬 Contactar por WhatsApp
          </a>
        )}
      </main>
    </div>
  );
}

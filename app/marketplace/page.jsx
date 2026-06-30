'use client';
import { useState, useEffect } from 'react';

export default function MarketplacePage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/organizaciones')
      .then(r => r.json())
      .then(d => { setOrgs(d.organizaciones || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = orgs.filter(o =>
    o.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    o.ciudad?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <header className="bg-gradient-to-r from-[#111827] to-gray-900 px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl font-black text-white">MARKETPLACE</h1>
          <p className="text-sm text-gray-400 mt-1">Descubrí rifas de organizaciones cerca tuyo</p>
          <div className="mt-4 relative">
            <input
              type="text"
              placeholder="🔍 Buscar organización o ciudad..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl p-4 pl-10 bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:border-[#FE2C55] outline-none font-bold"
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl animate-spin">⚙️</div>
            <p className="mt-4 font-bold text-gray-500">Cargando organizaciones...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#EBEBEB]">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-bold text-[#333]">Sin resultados</p>
            <p className="text-sm text-gray-500 mt-1">
              {search ? 'No encontramos organizaciones con ese nombre' : 'Aún no hay organizaciones en el marketplace'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 font-bold">{filtered.length} organizaciones encontradas</p>
            {filtered.map(org => (
              <a
                key={org.id}
                href={`/organization/${org.slug}`}
                className="block bg-white rounded-2xl p-4 border border-[#EBEBEB] hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FE2C55] to-[#C12045] flex items-center justify-center text-white text-xl font-black flex-shrink-0">
                    {org.logo_url ? <img src={org.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" /> : org.nombre?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-[#333] truncate">{org.nombre}</h3>
                    <p className="text-xs text-gray-500 truncate">{org.descripcion || 'Organización de rifas'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {org.ciudad && <span className="text-[10px] text-gray-400">📍 {org.ciudad}</span>}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#3483FA]/10 text-[#3483FA] font-bold">Plan {org.plan?.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-black text-[#39B54A]">{org.total_rifas || 0}</p>
                    <p className="text-[10px] text-gray-400">rifas</p>
                  </div>
                </div>
              </a>
            ))}
          </>
        )}

        <div className="bg-gradient-to-r from-[#FE2C55]/10 to-[#25F4EE]/10 rounded-2xl p-6 border border-[#FE2C55]/20 text-center mt-8">
          <p className="text-2xl mb-2">🚀</p>
          <h3 className="font-black text-lg text-[#111827]">¿Organizás rifas?</h3>
          <p className="text-sm text-gray-600 mt-1">Creá tu organización gratis y empezá a recaudar hoy</p>
          <a href="/" className="inline-block mt-3 px-6 py-2 rounded-xl font-bold bg-[#FE2C55] text-white text-sm">Crear mi organización →</a>
        </div>
      </main>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AfiliadosPage() {
  const [user, setUser] = useState(null);
  const [afiliado, setAfiliado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
        loadAfiliado(data.session.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const loadAfiliado = async (userId) => {
    try {
      const res = await fetch(`/api/afiliados?user_id=${userId}`);
      const data = await res.json();
      if (data.afiliado) setAfiliado(data.afiliado);
    } catch (e) {}
    setLoading(false);
  };

  const createAfiliado = async () => {
    if (!user) return;
    setCreating(true);
    const res = await fetch('/api/afiliados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id }),
    });
    const data = await res.json();
    if (data.success) setAfiliado(data.afiliado);
    else alert(data.error);
    setCreating(false);
  };

  const copyLink = async () => {
    const link = `https://eco-rifas.vercel.app/?ref=${afiliado?.codigo}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(link);
    }
  };

  return (
    <div className="min-h-screen bg-[#111827]">
      <header className="px-4 pt-8 pb-6">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-4xl mb-3">🤝</p>
          <h1 className="text-3xl font-black text-white">PROGRAMA DE AFILIADOS</h1>
          <p className="text-gray-400 mt-2">Ganá 10% de comisión por cada organización nueva que traigas</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-12 space-y-4">
        {!user ? (
          <div className="bg-white/5 rounded-2xl p-8 text-center border border-gray-700">
            <p className="text-4xl mb-3">🔐</p>
            <h3 className="text-xl font-black text-white">Iniciá sesión</h3>
            <p className="text-sm text-gray-400 mt-2">Necesitás una cuenta para ser afiliado</p>
            <a href="/" className="inline-block mt-4 px-6 py-3 rounded-xl font-bold bg-[#FE2C55] text-white">Entrar</a>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="text-4xl animate-spin">⚙️</div>
          </div>
        ) : !afiliado ? (
          <div className="bg-white/5 rounded-2xl p-8 text-center border border-gray-700">
            <p className="text-4xl mb-3">🚀</p>
            <h3 className="text-xl font-black text-white">Convertite en afiliado</h3>
            <p className="text-sm text-gray-400 mt-2">
              Compartí tu código y ganá 10% de comisión por cada organización que se una a Eco Rifas.
              <br /><br />
              <strong className="text-white">Ejemplo:</strong> Si traes 10 organizaciones que recaudan $300.000 cada una, ganás <span className="text-[#39B54A] font-black">$240.000</span> de comisiones.
            </p>
            <button onClick={createAfiliado} disabled={creating} className="mt-6 px-8 py-3 rounded-xl font-black bg-[#FE2C55] text-white disabled:opacity-50">
              {creating ? '⏳ Creando...' : '✨ Ser afiliado gratis'}
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-r from-[#39B54A]/20 to-[#25F4EE]/20 rounded-2xl p-6 border border-[#39B54A]/30">
              <h3 className="font-black text-white text-lg">Tu código de afiliado</h3>
              <div className="mt-3 bg-white/10 rounded-xl p-4 flex items-center justify-between">
                <p className="text-2xl font-black text-[#39B54A] font-mono">{afiliado.codigo}</p>
                <button onClick={copyLink} className="px-4 py-2 rounded-lg bg-[#39B54A] text-white font-bold text-sm">
                  {copied ? '✅ Copiado' : '📋 Copiar link'}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Link: https://eco-rifas.vercel.app/?ref={afiliado.codigo}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-3xl font-black text-white">{afiliado.total_referidos || 0}</p>
                <p className="text-xs text-gray-400 mt-1">Referidos</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center border border-gray-700">
                <p className="text-3xl font-black text-[#39B54A]">${(afiliado.total_ganado || 0).toLocaleString('es-AR')}</p>
                <p className="text-xs text-gray-400 mt-1">Ganado</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-gray-700">
              <h3 className="font-black text-white mb-3">📱 Compartir</h3>
              <div className="space-y-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(`🎉 ¡Eco Rifas es la plataforma para organizar rifas! 🎰\n\nCreá tu propia rifa en 2 minutos y empezá a recaudar.\n\nUsá mi código: ${afiliado.codigo}\n👉 https://eco-rifas.vercel.app/?ref=${afiliado.codigo}`)}`} target="_blank" className="block p-3 rounded-xl bg-[#39B54A] text-white font-bold text-center">
                  📲 WhatsApp
                </a>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🎉 @EcoRifas - La plataforma para organizar rifas online. Creá tu rifa gratis! https://eco-rifas.vercel.app/?ref=${afiliado.codigo}`)}`} target="_blank" className="block p-3 rounded-xl bg-[#1DA1F2] text-white font-bold text-center">
                  🐦 Twitter / X
                </a>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://eco-rifas.vercel.app/?ref=${afiliado.codigo}`)}`} target="_blank" className="block p-3 rounded-xl bg-[#1877F2] text-white font-bold text-center">
                  📘 Facebook
                </a>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

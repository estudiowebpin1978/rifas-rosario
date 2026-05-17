'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import LogoImg from '../public/logo.png';

export default function SocialFeed() {
  const router = useRouter();
  const [reels, setReels] = useState([]);
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const URL_APP = typeof window !== 'undefined' ? window.location.origin + '/app' : 'https://rifas-rosario.vercel.app/app';

  const copyToClipboard = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(msg || 'Copiado!');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert(msg || 'Copiado!');
    }
  };

  useEffect(() => {
    fetchReels();
    fetchWinners();
  }, []);

  const fetchReels = async () => {
    try {
      const res = await fetch('/api/reels');
      const data = await res.json();
      if (data.reels) setReels(data.reels);
    } catch (e) {
      console.log('No reels yet');
    }
    setLoading(false);
  };

  const fetchWinners = async () => {
    try {
      const res = await fetch('/api/productos');
      const data = await res.json();
      if (data.productos) {
        setWinners(data.productos.filter(p => p.finalizado && p.ganador_num));
      }
    } catch (e) {
      console.log('Error fetching winners');
    }
  };

  const shareWinner = (winner) => {
    const msg = '🏆 Eco Rifas\n\n🎉 ' + winner.ganador_nombre + ' ganó ' + (winner.title || winner.nombre) + '!\n\nTu próxima oportunidad está a un click! ' + URL_APP;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  const shareWA = () => { window.open('https://wa.me/?text=' + encodeURIComponent('Eco Rifas - Los productos que amas, ahora los podes ganar en rifas economicas! 🎉 ' + URL_APP), '_blank'); };
  const shareIG = () => { copyToClipboard(URL_APP, 'Link copiado! Pegalo en tu Instagram 📷'); };
  const shareTT = () => { copyToClipboard(URL_APP, 'Link copiado! Pegalo en tu TikTok 🎵'); };
  const shareX = () => { window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent('Eco Rifas - Los productos que amas, ahora los podes ganar en rifas economicas! 🎉 ' + URL_APP), '_blank'); };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>

      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => router.push('/app')} className="p-2 rounded-full bg-white/10">←</button>
          <h1 className="text-xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">GANADORES & REELS</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6 relative z-10">
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-2xl p-4 border border-yellow-500/30 text-center">
          <span className="text-4xl animate-bounce inline-block">🎊</span>
          <h2 className="text-xl font-black mt-2">GALERÍA DE CAMPEONES</h2>
          <p className="text-gray-400 text-sm">Mirá quienes ya se llevaron premios!</p>
        </div>

        {winners.length > 0 ? (
          <div className="space-y-4">
            {winners.map((w, i) => (
              <div key={w.id} className="bg-gray-900/80 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10">
                <div className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-yellow-500 p-1">
                    <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center text-2xl">👤</div>
                  </div>
                  <div className="flex-1">
                    <p className="font-black">{w.ganador_nombre}</p>
                    <p className="text-sm text-pink-400">Ganó: {w.title || w.nombre}</p>
                    <p className="text-xs text-gray-500">#{String(w.ganador_num).padStart(2,'0')}</p>
                  </div>
                  {i === 0 && <span className="text-2xl">👑</span>}
                </div>
                <div className="px-4 pb-4 flex gap-2">
                  <button onClick={() => shareWinner(w)} className="flex-1 bg-green-500 text-white font-bold py-2 rounded-xl text-sm">
                    Compartir 💬
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🏆</span>
            <p className="font-black text-xl">Próximamente</p>
            <p className="text-gray-400 text-sm mt-2">Los primeros ganadores aparecerán acá!</p>
          </div>
        )}

        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
          <h3 className="font-black mb-4 flex items-center gap-2">🎬 REELS PROMOCIONALES</h3>
          {reels.length > 0 ? (
            <div className="space-y-3">
              {reels.map(r => (
                <div key={r.id} className="bg-black/50 rounded-xl overflow-hidden">
                  {r.thumbnail_url ? (
                    <img src={r.thumbnail_url} alt={r.titulo} className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="aspect-video bg-gradient-to-r from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-5xl">🎬</span>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="font-bold text-sm">{r.titulo}</p>
                    {r.video_url && (
                      <a href={r.video_url} target="_blank" className="text-pink-400 text-xs mt-1 block">Ver video →</a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="text-4xl mb-2 block">📹</span>
              <p className="text-sm text-gray-400">Reels de productos pronto!</p>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl p-4 border border-pink-500/30 text-center">
          <h3 className="font-black text-lg mb-2">🔥 SUMATE AL PRÓXIMO SORTEO</h3>
          <p className="text-gray-400 text-sm mb-4">Miles de pesos en premios te esperan!</p>
          <button onClick={() => router.push('/app')} className="w-full btn-3d-pink">PARTICIPAR AHORA 🚀</button>
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
          <h3 className="font-black mb-3">📱 COMPARTE Y GANA VISIBILIDAD</h3>
          <p className="text-gray-400 text-sm mb-3">Ayudanos a llegar a más personas!</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={shareWA} className="btn-3d-sm bg-gradient-to-r from-green-500 to-emerald-500">💬 WhatsApp</button>
            <button onClick={shareIG} className="btn-3d-sm bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">📷 Instagram</button>
            <button onClick={shareTT} className="btn-3d-sm bg-black border border-white/20">🎵 TikTok</button>
            <button onClick={shareX} className="btn-3d-sm bg-black">✖ X</button>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 z-50">
        <div className="max-w-lg mx-auto flex justify-around">
          <button className="flex flex-col items-center gap-1 text-pink-500">
            <span className="text-xl">🏆</span>
            <span className="text-xs font-bold">Feed</span>
          </button>
          <button onClick={() => router.push('/app')} className="flex flex-col items-center gap-1 text-gray-400">
            <span className="text-xl">🎰</span>
            <span className="text-xs font-bold">Rifas</span>
          </button>
          <button onClick={() => router.push('/profile')} className="flex flex-col items-center gap-1 text-gray-400">
            <span className="text-xl">👤</span>
            <span className="text-xs font-bold">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
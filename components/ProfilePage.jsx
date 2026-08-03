'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/authFetch';
import confetti from 'canvas-confetti';
import Image from 'next/image';

const WHATSAPP = '5493412500029';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [wins, setWins] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stats, setStats] = useState({ participados: 0, ganados: 0, ranking: 0 });

  useEffect(() => {
    const saved = localStorage.getItem('rifa_user');
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        setUser(userData);
        setNombre(userData.nombre || '');
        setWhatsapp(userData.whatsapp || '');
        setFotoUrl(userData.foto_url || '');
        fetchWins(userData.whatsapp);
      } catch (e) {
        localStorage.removeItem('rifa_user');
        setShowAuth(true);
      }
    } else {
      setShowAuth(true);
    }
  }, []);

  const fetchWins = async (wa) => {
    if (!wa) return;
    try {
      const res = await fetch(`/api/user-profile?whatsapp=${wa}`);
      const data = await res.json();
      if (data.wins) {
        setWins(data.wins);
        const ganados = data.wins.filter(w => w.productos?.finalizado).length;
        setStats({ participados: data.wins.length, ganados, ranking: Math.max(1, 100 - ganados * 10) });
        if (ganados > 0) {
          setShowConfetti(true);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          setTimeout(() => setShowConfetti(false), 3000);
        }
      }
    } catch (e) {
      console.log('Error fetching wins');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await authFetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setFotoUrl(data.url);
        saveProfile(data.url);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
    setUploadingPhoto(false);
  };

  const saveProfile = (foto = fotoUrl) => {
    const userData = { whatsapp, nombre, foto_url: foto };
    localStorage.setItem('rifa_user', JSON.stringify(userData));
    setUser(userData);
    setShowAuth(false);
  };

  const handleLogin = () => {
    if (!whatsapp || whatsapp.length < 8) {
      alert('Ingresá tu WhatsApp válido');
      return;
    }
    saveProfile();
    fetchWins(whatsapp);
  };

  const nivel = stats.ganados >= 10 ? 'LEYENDA' : stats.ganados >= 5 ? 'CAMPEON' : stats.ganados >= 2 ? 'ESTRELLA' : 'NOVATO';
  const nivelColor = stats.ganados >= 10 ? 'from-yellow-400 to-orange-500' : stats.ganados >= 5 ? 'from-pink-500 to-purple-500' : stats.ganados >= 2 ? 'from-cyan-500 to-blue-500' : 'from-gray-500 to-gray-600';
  const nivelEmoji = stats.ganados >= 10 ? '👑' : stats.ganados >= 5 ? '🏆' : stats.ganados >= 2 ? '⭐' : '🐣';

  const shareToWhatsApp = () => {
    const msg = 'Eco Rifas - Los productos que amas, ahora los podes ganar en rifas economicas! 🎉 ' + (typeof window !== 'undefined' ? window.location.origin + '/app' : '');
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-8">
            <Image src="/logo.png" alt="Eco Rifas" width={80} height={80} className="object-contain rounded-2xl mx-auto mb-4" />
            <h1 className="text-3xl font-black bg-gradient-to-r from-pink-500 to-cyan-500 bg-clip-text text-transparent">MI PERFIL</h1>
            <p className="text-gray-400 mt-2">Tu historial de sorteos ganados</p>
          </div>
          
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">Tu WhatsApp</label>
                <input type="tel" placeholder="5493412500029" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl p-4 font-bold" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-400 mb-1 block">Tu Nombre</label>
                <input type="text" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl p-4 font-bold" />
              </div>
              <button onClick={handleLogin} className="w-full btn-3d-pink">ENTRAR 🚀</button>
            </div>
          </div>
          
          <button onClick={() => router.push('/app')} className="w-full mt-4 py-3 text-gray-400 font-bold">
            ← Volver a rifas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-lg md:max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/app')} className="p-2 rounded-full bg-white/10">←</button>
            <h1 className="text-xl font-black">MI PERFIL</h1>
          </div>
          <button onClick={() => { localStorage.removeItem('rifa_user'); setUser(null); setShowAuth(true); }} className="text-sm text-gray-400">Salir</button>
        </div>
      </header>

      <main className="max-w-lg md:max-w-4xl mx-auto p-4 space-y-6 relative z-10">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-3xl blur-xl opacity-50"></div>
          <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-6 border border-white/10 text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 p-1">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Tu foto" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center text-4xl">👤</div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-pink-500 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-sm">📷
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
              {uploadingPhoto && <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center"><span className="text-xs">⏳</span></div>}
            </div>
            
            <h2 className="text-2xl font-black mt-3">{nombre || 'Usuario'}</h2>
            <p className="text-gray-400 text-sm">{whatsapp}</p>
            
            <div className={`inline-block mt-3 px-4 py-1.5 rounded-full bg-gradient-to-r ${nivelColor} font-black text-sm`}>
              {nivelEmoji} {nivel}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-3xl font-black text-pink-500">{stats.participados}</p>
            <p className="text-xs text-gray-400 font-bold">PARTICIPADOS</p>
          </div>
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-3xl font-black text-[#FE2C55]">{stats.ganados}</p>
            <p className="text-xs text-gray-400 font-bold">GANADOS</p>
          </div>
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-3xl font-black text-cyan-500">#{stats.ranking}</p>
            <p className="text-xs text-gray-400 font-bold">RANKING</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#FE2C55]/20 to-[#25F4EE]/20 rounded-2xl p-4 border border-[#FE2C55]/30">
          <h3 className="font-black flex items-center gap-2 mb-3">🏆 MIS PREMIOS GANADOS</h3>
          {wins.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-5xl mb-3 block">🎰</span>
              <p className="font-bold">Aún no ganaste ninguna rifa</p>
              <p className="text-sm text-gray-400 mt-1">Participá y podría ser tu turno!</p>
              <button onClick={() => router.push('/app')} className="mt-4 btn-3d-cyan">VER RIFAS 🎰</button>
            </div>
          ) : (
            <div className="space-y-3">
              {wins.filter(w => w.productos?.finalizado).map((win, i) => (
                <div key={i} className="bg-black/50 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-3xl">🎉</span>
                  <div className="flex-1">
                    <p className="font-black text-sm">{win.productos?.title || win.productos?.nombre}</p>
                    <p className="text-xs text-pink-400">#{String(win.numero).padStart(2,'0')}</p>
                  </div>
                  <span className="text-xs bg-[#FE2C55]/20 text-[#FE2C55] px-2 py-1 rounded-full font-bold">GANADOR</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
          <h3 className="font-black mb-3">📊 ESTADÍSTICAS</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Tasa de victoria</span>
              <span className="font-bold text-pink-500">
                {stats.participados > 0 ? Math.round((stats.ganados / stats.participados) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-pink-500 to-cyan-500 rounded-full" style={{ width: `${stats.participados > 0 ? (stats.ganados / stats.participados) * 100 : 0}%` }}></div>
            </div>
            <div className="flex justify-between items-center mt-3">
              <span className="text-sm text-gray-400">Números jugados</span>
              <span className="font-bold">{stats.participados * 100}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/30">
          <p className="text-center font-black text-sm">💡 INVITÁ A TUS AMIGOS! MIENTRAS MAS RAPIDO SE VENDAN LAS RIFAS MAS RAPIDO PODRIAS OBTENER TU PREMIO🎁</p>
          <button onClick={shareToWhatsApp} className="w-full mt-3 bg-green-500 text-white font-black py-3 rounded-xl">
            COMPARTIR EN WHATSAPP 💬
          </button>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 z-50">
        <div className="max-w-lg md:max-w-4xl mx-auto flex justify-around">
          <button onClick={() => router.push('/app')} className="flex flex-col items-center gap-1 text-gray-400">
            <span className="text-xl">🎰</span>
            <span className="text-xs font-bold">Rifas</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-pink-500">
            <span className="text-xl">👤</span>
            <span className="text-xs font-bold">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
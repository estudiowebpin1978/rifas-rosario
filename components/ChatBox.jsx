'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ChatBox({ user, productos, allBoletos }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [productoActivo, setProductoActivo] = useState(null);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [userWhatsapp, setUserWhatsapp] = useState('');
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [participaEnProducto, setParticipaEnProducto] = useState(false);
  const [userName, setUserName] = useState('');
  const [verifiedWhatsapp, setVerifiedWhatsapp] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [prevMessagesLength, setPrevMessagesLength] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const saved = localStorage.getItem('chat_whatsapp');
    const savedName = localStorage.getItem('chat_name');
    if (saved) setVerifiedWhatsapp(saved);
    if (savedName) setUserName(savedName);
  }, []);

  useEffect(() => {
    if (!minimized) {
      fetchMessages();
      scrollToBottom();
    }
  }, [minimized, productoActivo]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('chat_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          const newMsgs = [payload.new, ...prev].slice(0, 100);
          if (minimized && newMsgs.length > prev.length) {
            setUnreadCount(c => c + 1);
          }
          return newMsgs;
        });
        if (!minimized) setTimeout(scrollToBottom, 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [minimized]);

  useEffect(() => {
    if (verifiedWhatsapp && productoActivo) {
      verificarParticipacion();
    }
  }, [verifiedWhatsapp, productoActivo]);

  const fetchMessages = async () => {
    try {
      let url = '/api/chat?limit=50';
      if (productoActivo) url += '&producto_id=' + productoActivo.id;
      const res = await fetch(url);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (e) {
      console.log('Error fetching chat');
    }
    setLoading(false);
  };

  const verificarParticipacion = async () => {
    if (!productoActivo || !verifiedWhatsapp) return;
    try {
      const res = await fetch('/api/verificar-participacion?whatsapp=' + encodeURIComponent(verifiedWhatsapp) + '&producto_id=' + productoActivo.id);
      const data = await res.json();
      setParticipaEnProducto(data.participa || false);
    } catch (e) {
      setParticipaEnProducto(false);
    }
  };

  const getWinnerNumbers = () => {
    if (!productoActivo || !allBoletos) return [];
    return allBoletos
      .filter(b => b.producto_id === productoActivo.id && b.estado === 'vendido')
      .map(b => b.whatsapp);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!verifiedWhatsapp && productoActivo) {
      setShowWhatsappModal(true);
      return;
    }

    const tempMsg = newMessage;
    setNewMessage('');

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || null,
          user_name: userName || (user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Anónimo'),
          message: tempMsg.trim(),
          producto_id: productoActivo?.id || null,
          whatsapp: verifiedWhatsapp || null
        })
      });
    } catch (err) {
      console.error('Error sending message');
      setNewMessage(tempMsg);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id || null,
            user_name: userName || (user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Anónimo'),
            image_url: data.url,
            message: '📷 ',
            producto_id: productoActivo?.id || null,
            whatsapp: verifiedWhatsapp || null
          })
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
    setUploading(false);
  };

  const handleVerifyWhatsapp = () => {
    if (!userWhatsapp || userWhatsapp.length < 8) {
      alert('Ingresá un WhatsApp válido');
      return;
    }
    setVerifiedWhatsapp(userWhatsapp);
    localStorage.setItem('chat_whatsapp', userWhatsapp);
    if (userName) localStorage.setItem('chat_name', userName);
    setShowWhatsappModal(false);
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    if (isToday(dateStr)) return 'Hoy';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  const emojis = ['🔥', '🎉', '🎊', '🏆', '💯', '❤️', '🙌', '👏', '😍', '🤩', '🎰', '🍀', '💰', '👑', '⭐', '💪', '🚀', '✨'];

  const productosActivos = (productos || []).filter(p => !p.finalizado);
  const winnerNumbers = getWinnerNumbers();

  return (
    <>
      {/* Floating chat button when minimized */}
      {minimized ? (
        <button
          onClick={() => { setMinimized(false); setUnreadCount(0); }}
          className="fixed bottom-20 right-4 z-[90] btn-3d-pink rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-2xl animate-bounce"
        >
          💬
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      ) : (
        /* Expanded chat panel */
        <div className="fixed inset-0 z-[80] flex items-end justify-center" onClick={() => setMinimized(true)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative w-full max-w-md h-[85vh] bg-white rounded-t-[2rem] shadow-2xl border-t-4 border-[#25F4EE] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#EBEBEB] bg-gradient-to-r from-[#111827] to-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#39B54A] rounded-full animate-pulse"></div>
                <div>
                  <h2 className="font-black text-sm text-[#FE2C55]">
                    {productoActivo ? (productoActivo.title || productoActivo.nombre) : 'CHAT EN VIVO'}
                  </h2>
                  <p className="text-[10px] text-[#666]">{messages.length} mensajes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowProductSelector(!showProductSelector)}
                  className="px-3 py-1.5 bg-white/80 rounded-lg text-xs font-bold text-[#333] shadow-sm"
                >
                  {productoActivo ? '📦 Cambiar' : '📦 General'}
                </button>
                <button onClick={() => setMinimized(true)} className="p-1.5 hover:bg-black/10 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Product selector */}
            {showProductSelector && (
              <div className="absolute top-16 left-4 right-4 z-10 bg-white rounded-xl shadow-2xl border border-[#EBEBEB] p-2 max-h-60 overflow-y-auto">
                <button
                  onClick={() => { setProductoActivo(null); setShowProductSelector(false); setParticipaEnProducto(false); }}
                  className={`w-full text-left p-3 rounded-lg text-sm font-bold transition-colors ${!productoActivo ? 'bg-[#25F4EE] text-[#333]' : 'hover:bg-[#F5F5F5] text-[#666]'}`}
                >
                  💬 Chat General (Todas las rifas)
                </button>
                {productosActivos.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setProductoActivo(p); setShowProductSelector(false); }}
                    className={`w-full text-left p-3 rounded-lg text-sm font-bold transition-colors ${productoActivo?.id === p.id ? 'bg-[#25F4EE] text-[#333]' : 'hover:bg-[#F5F5F5] text-[#666]'}`}
                  >
                    🎰 {p.title || p.nombre}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F5F5F5]" style={{ scrollBehavior: 'smooth' }}>
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <span className="text-5xl mb-3 block">💬</span>
                  <p className="font-bold text-gray-500">
                    {productoActivo ? 'Chat de ' + (productoActivo.title || productoActivo.nombre) : 'Chat General'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {productoActivo && !verifiedWhatsapp 
                      ? 'Identificate con tu WhatsApp para participar'
                      : 'Se el primero en escribir!'}
                  </p>
                  {productoActivo && !verifiedWhatsapp && (
                    <button
                      onClick={() => setShowWhatsappModal(true)}
                      className="mt-3 btn-3d-cyan text-sm px-6 py-2"
                    >
                      📱 Identificarme
                    </button>
                  )}
                </div>
              ) : (
                [...messages].reverse().map((msg, i) => {
                  const prevMsg = messages[messages.length - 1 - i + 1];
                  const showDate = i === 0 || !isSameDay(msg.created_at, prevMsg?.created_at);
                  const isWinner = msg.is_winner;
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex items-center gap-2 my-4">
                          <div className="flex-1 h-px bg-[#EBEBEB]"></div>
                          <span className="text-xs text-gray-400 font-bold">{formatDate(msg.created_at)}</span>
                          <div className="flex-1 h-px bg-[#EBEBEB]"></div>
                        </div>
                      )}
                      <div className="group">
                        <div className="flex items-start gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 relative ${isWinner ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-[#3483FA] to-[#1A3C6D]'}`}>
                            {msg.user_name?.charAt(0).toUpperCase() || '?'}
                            {isWinner && (
                              <span className="absolute -top-1 -right-1 text-xs">🏆</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-sm truncate ${isWinner ? 'text-[#C12045]' : 'text-[#3483FA]'}`}>
                                {msg.user_name}
                                {isWinner && <span className="ml-1 text-[10px] bg-[#FE2C55]/10 text-[#C12045] px-1.5 py-0.5 rounded-full font-bold">GANADOR</span>}
                              </span>
                              <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
                            </div>
                            {msg.message && msg.message !== '📷 ' && (
                              <p className="text-sm text-[#333] mt-0.5 break-words">{msg.message}</p>
                            )}
                            {msg.image_url && (
                              <img
                                src={msg.image_url}
                                alt="Imagen compartida"
                                className="mt-1 max-w-[200px] rounded-xl border border-[#EBEBEB] cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.image_url, '_blank')}
                              />
                            )}
                            {msg.producto_id && (
                              <span className="text-[10px] text-gray-400 mt-1 block">
                                🎰 {productos?.find(p => p.id === msg.producto_id)?.title || productos?.find(p => p.id === msg.producto_id)?.nombre || 'Producto'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Winner info banner */}
            {productoActivo?.finalizado && productoActivo?.ganador_nombre && (
              <div className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-center">
                <p className="text-sm font-black text-white">
                  🏆 GANADOR: {productoActivo.ganador_nombre} - #{String(productoActivo.ganador_num).padStart(2, '0')}
                </p>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-[#EBEBEB] bg-white">
              {productoActivo && !verifiedWhatsapp && (
                <div className="mb-2 p-2 rounded-lg bg-[#FE2C55]/10 border border-[#FE2C55]/20 text-center">
                  <p className="text-xs font-bold text-[#C12045]">
                    Identificate con tu WhatsApp para chatear en este producto
                  </p>
                  <button onClick={() => setShowWhatsappModal(true)} className="text-xs font-bold text-[#3483FA] underline mt-1">
                    Identificarme
                  </button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmoji(!showEmoji)}
                  className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center text-lg hover:bg-[#EBEBEB] flex-shrink-0"
                >😊</button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={productoActivo && !verifiedWhatsapp ? 'Identificate para chatear...' : 'Escribí un mensaje...'}
                  className="flex-1 rounded-xl bg-[#F5F5F5] border border-[#EBEBEB] px-4 py-2.5 text-sm font-bold outline-none focus:border-[#3483FA] text-[#333]"
                  maxLength={500}
                  disabled={productoActivo && !verifiedWhatsapp}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center text-lg hover:bg-[#EBEBEB] flex-shrink-0"
                >{uploading ? '⏳' : '📷'}</button>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || (productoActivo && !verifiedWhatsapp)}
                  className="bg-gradient-to-r from-[#3483FA] to-[#1A3C6D] text-white w-10 h-10 rounded-xl font-black flex items-center justify-center disabled:opacity-50 flex-shrink-0 shadow-md"
                >➤</button>
              </form>
              {showEmoji && (
                <div className="flex gap-1 flex-wrap mt-2 p-2 bg-[#F5F5F5] rounded-xl">
                  {emojis.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { setNewMessage(prev => prev + emoji); setShowEmoji(false); }}
                      className="text-xl hover:scale-125 transition-transform p-1"
                    >{emoji}</button>
                  ))}
                </div>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              <p className="text-[10px] text-gray-400 text-center mt-1.5">
                {verifiedWhatsapp ? `✅ ${userName || 'Identificado'}` : 'Todos pueden leer - Identificate para escribir'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp verification modal */}
      {showWhatsappModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setShowWhatsappModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-sm rounded-2xl p-6 bg-white shadow-2xl border-t-4 border-[#25F4EE]" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <span className="text-5xl block mb-3">📱</span>
              <h2 className="text-xl font-black text-[#1A3C6D]">IDENTIFICATE</h2>
              <p className="text-xs text-gray-500 mt-1">
                Ingresá tu WhatsApp para chatear en el producto
                {productoActivo && <span className="font-bold"> {productoActivo.title || productoActivo.nombre}</span>}
              </p>
              {!productoActivo && (
                <p className="text-xs text-gray-400 mt-2">Solo quienes hayan pagado pueden participar en los chats de productos</p>
              )}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tu nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Perez"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full rounded-xl p-3.5 font-bold bg-white border border-[#EBEBEB] focus:border-[#3483FA] outline-none text-[#333]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tu WhatsApp (con codigo de pais)</label>
                <input
                  type="tel"
                  placeholder="Ej: 5493412500029"
                  value={userWhatsapp}
                  onChange={e => setUserWhatsapp(e.target.value)}
                  className="w-full rounded-xl p-3.5 font-bold bg-white border border-[#EBEBEB] focus:border-[#3483FA] outline-none text-[#333]"
                />
              </div>
              <button onClick={handleVerifyWhatsapp} className="w-full btn-3d-cyan text-sm">
                ✅ IDENTIFICARME
              </button>
            </div>
            <button onClick={() => setShowWhatsappModal(false)} className="w-full mt-3 py-2 text-sm font-bold text-gray-400">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.toDateString() === date2.toDateString();
}

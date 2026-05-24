'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const NAMES = ['Carlos', 'María', 'Juan', 'Ana', 'Luis', 'Sofía', 'Pedro', 'Valentina', 'Diego', 'Camila'];
const COLORS = ['#3483FA', '#FE2C55', '#39B54A', '#F5A623', '#9B59B6', '#1ABC9C', '#E74C3C', '#3498DB', '#2ECC71', '#E67E22'];

function getUserColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function ChatBox({ user, productos, allBoletos }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [productoActivo, setProductoActivo] = useState(null);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [userWhatsapp, setUserWhatsapp] = useState('');
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [verifiedWhatsapp, setVerifiedWhatsapp] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const channelRef = useRef(null);
  const minimizedRef = useRef(minimized);
  useEffect(() => { minimizedRef.current = minimized; }, [minimized]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    const saved = localStorage.getItem('chat_whatsapp');
    const savedName = localStorage.getItem('chat_name');
    if (saved) setVerifiedWhatsapp(saved);
    if (savedName) setUserName(savedName);
  }, []);

  useEffect(() => {
    if (!supabase || aiMode) return;
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    channelRef.current = supabase.channel('chat_realtime_' + Date.now())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          const newMsgs = [...prev, payload.new];
          if (newMsgs.length > 100) newMsgs.splice(0, newMsgs.length - 100);
          if (minimizedRef.current) setUnreadCount(c => c + 1);
          else scrollToBottom();
          return newMsgs;
        });
      })
      .subscribe();

    return () => { if (channelRef.current && supabase) supabase.removeChannel(channelRef.current); };
  }, [aiMode]);

  useEffect(() => {
    if (!minimized && !aiMode) fetchMessages();
  }, [minimized, productoActivo, aiMode]);

  useEffect(() => {
    if (aiMode && messages.length === 0) {
      setMessages([{
        id: 'ai-welcome',
        user_name: 'Asistente IA',
        message: '¡Hola! Soy el asistente de **Eco Rifas** 🎉\n\nPreguntame lo que quieras:\n• ¿Cómo funcionan las rifas?\n• ¿Cómo compro un número?\n• ¿Cómo se sortea?\n• ¿Qué productos hay disponibles?\n• ¿Medios de pago?\n\n¡También puedo ayudarte a elegir tu número de la suerte! 🍀',
        created_at: new Date().toISOString(),
        is_ai: true
      }]);
    }
  }, [aiMode]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      let url = '/api/chat?limit=50';
      if (productoActivo) url += '&producto_id=' + productoActivo.id;
      const res = await fetch(url);
      const data = await res.json();
      if (data.messages) setMessages(data.messages || []);
    } catch (e) {
      console.log('Error fetching chat');
    }
    setLoading(false);
  };

  const handleSendReal = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (productoActivo && !verifiedWhatsapp) {
      setShowWhatsappModal(true);
      return;
    }

    const msg = newMessage;
    setNewMessage('');

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || null,
          user_name: userName || 'Anónimo',
          message: msg.trim(),
          producto_id: productoActivo?.id || null,
          whatsapp: verifiedWhatsapp || null
        })
      });
    } catch {
      setNewMessage(msg);
    }
  };

  const handleSendAI = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || aiLoading) return;

    const userMsg = { id: 'user-' + Date.now(), user_name: userName || 'Vos', message: newMessage, created_at: new Date().toISOString(), is_ai: false };
    setMessages(prev => [...prev, userMsg]);
    setNewMessage('');
    setAiLoading(true);
    setAiError('');

    try {
      const res = await fetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.message,
          producto_id: productoActivo?.id || null,
          producto_info: productoActivo ? { title: productoActivo.title || productoActivo.nombre, price: productoActivo.raffle_price, numbers_total: productoActivo.numbers_total } : null,
          user_name: userName || 'Usuario',
          productos_activos: (productos || []).filter(p => !p.finalizado).map(p => ({ id: p.id, title: p.title || p.nombre, price: p.raffle_price, vendidos: (allBoletos || []).filter(b => b.producto_id === p.id && b.estado === 'vendido').length, total: p.numbers_total || 100 }))
        })
      });
      const data = await res.json();
      if (data.response) {
        setMessages(prev => [...prev, { id: 'ai-' + Date.now(), user_name: 'Asistente IA', message: data.response, created_at: new Date().toISOString(), is_ai: true, product_suggestions: data.product_suggestions || null }]);
      } else {
        setAiError(data.error || 'Error al obtener respuesta');
      }
    } catch {
      setAiError('Error de conexión. Probá de nuevo.');
    }
    setAiLoading(false);
    scrollToBottom();
  };

  const handleSend = aiMode ? handleSendAI : handleSendReal;

  const handleVerifyWhatsapp = () => {
    if (!userWhatsapp || userWhatsapp.length < 8) {
      alert('WhatsApp inválido');
      return;
    }
    setVerifiedWhatsapp(userWhatsapp);
    localStorage.setItem('chat_whatsapp', userWhatsapp);
    if (userName) localStorage.setItem('chat_name', userName);
    setShowWhatsappModal(false);
  };

  const productosActivos = (productos || []).filter(p => !p.finalizado);
  const userNameResolved = userName || user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Anónimo';

  const formatTime = (d) => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d) => {
    const date = new Date(d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Hoy';
    const yesterday = new Date(Date.now() - 86400000);
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  };

  const WHATSAPP_ADMIN = '5493412500029';

  return (
    <>
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
        <div className="fixed inset-0 z-[80] flex items-end justify-center" onClick={() => setMinimized(true)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative w-full max-w-md h-[55vh] bg-white rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#075E54] text-white flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg flex-shrink-0">
                  {aiMode ? '🤖' : (productoActivo ? '🎰' : '💬')}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm leading-tight truncate">
                    {aiMode ? 'Asistente IA' : (productoActivo ? (productoActivo.title || productoActivo.nombre) : 'Chat General')}
                  </h2>
                  <p className="text-[10px] text-white/70 truncate">{aiMode ? 'Consultame lo que quieras' : messages.length + ' mensajes'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => { setAiMode(!aiMode); setMessages([]); setAiError(''); }}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${aiMode ? 'bg-[#25F4EE] text-[#111827]' : 'bg-white/20 text-white hover:bg-white/30'}`}
                  title={aiMode ? 'Volver al chat' : 'Asistente IA'}
                >
                  {aiMode ? '💬 Chat' : '🤖 IA'}
                </button>
                {!aiMode && (
                  <button
                    onClick={() => setShowProductSelector(!showProductSelector)}
                    className="px-2 py-1 bg-white/20 rounded text-xs font-bold hover:bg-white/30 transition-colors"
                    title="Cambiar de producto"
                  >
                    📦
                  </button>
                )}
                <button onClick={() => setMinimized(true)} className="p-1 hover:bg-white/20 rounded transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Product selector (only in real chat mode) */}
            {showProductSelector && !aiMode && (
              <div className="absolute top-14 left-2 right-2 z-10 bg-white rounded-xl shadow-2xl border border-gray-200 p-2 max-h-40 overflow-y-auto">
                <button
                  onClick={() => { setProductoActivo(null); setShowProductSelector(false); }}
                  className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-colors ${!productoActivo ? 'bg-[#075E54] text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  💬 Chat General
                </button>
                {productosActivos.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setProductoActivo(p); setShowProductSelector(false); }}
                    className={`w-full text-left p-2 rounded-lg text-xs font-bold transition-colors ${productoActivo?.id === p.id ? 'bg-[#075E54] text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                  >
                    🎰 {p.title || p.nombre}
                  </button>
                ))}
              </div>
            )}

            {/* Messages area */}
            <div className={`flex-1 overflow-y-auto p-3 space-y-1 ${aiMode ? 'bg-gradient-to-b from-[#1a1a2e] to-[#16213e]' : 'bg-[#ECE5DD]'}`} style={{ scrollBehavior: 'smooth' }}>
              {loading && <div className="text-center py-8 text-gray-400 text-sm">Cargando mensajes...</div>}
              {!loading && messages.length === 0 && !aiMode && (
                <div className="text-center py-12">
                  <span className="text-5xl mb-3 block">💬</span>
                  <p className="font-bold text-gray-500">Sin mensajes aún</p>
                  <p className="text-xs text-gray-400 mt-1">¡Sé el primero en escribir!</p>
                </div>
              )}
              {[...messages].map((msg, i) => {
                if (msg.is_ai) {
                  return (
                    <div key={msg.id} className="flex justify-start mb-3">
                      <div className="max-w-[85%]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 flex items-center justify-center text-white text-[8px] font-bold">🤖</div>
                          <span className="text-[10px] font-bold text-gray-300">Asistente IA</span>
                        </div>
                        <div className="rounded-lg px-3 py-2 text-sm leading-relaxed break-words bg-[#1e293b] text-gray-100 rounded-bl-sm shadow-md border border-white/5">
                          {msg.message.split('\n').map((line, j) => <p key={j} className={line.startsWith('•') ? 'ml-2' : ''}>{line}</p>)}
                          <p className="text-[10px] mt-1 text-gray-500 text-right">{formatTime(msg.created_at)}</p>
                        </div>
                        {msg.product_suggestions && msg.product_suggestions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {msg.product_suggestions.map((p, j) => (
                              <a key={j} href={`${window.location.origin}/app?producto=${p.id}`} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold hover:bg-cyan-500/40 transition-colors"
                              >{p.title}</a>
                            ))}
                          </div>
                        )}
                        <div className="mt-1 flex gap-1">
                          <button onClick={() => { window.open('https://wa.me/' + WHATSAPP_ADMIN + '?text=' + encodeURIComponent('Hola! Quiero comprar números en Eco Rifas 🎉'), '_blank'); }}
                            className="text-[9px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold hover:bg-green-500/40 transition-colors"
                          >💬 Hablar con vendedor</button>
                          <button onClick={() => { setAiMode(false); }}
                            className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold hover:bg-blue-500/40 transition-colors"
                          >🎰 Ver productos</button>
                        </div>
                      </div>
                    </div>
                  );
                }
                const isMe = msg.whatsapp === verifiedWhatsapp || msg.user_id === user?.id;
                const prevMsg = messages[i - 1];
                const showDate = i === 0 || formatDate(msg.created_at) !== formatDate(prevMsg?.created_at);
                const showAvatar = !isMe && (i === 0 || messages[i - 1]?.whatsapp !== msg.whatsapp);
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="text-center my-2">
                        <span className="bg-white/80 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}>
                      <div className={`max-w-[80%] ${isMe ? 'order-1' : 'order-2'}`}>
                        {!isMe && showAvatar && (
                          <div className="flex items-center gap-1.5 mb-0.5 ml-1">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                              style={{ backgroundColor: getUserColor(msg.user_name) }}>
                              {msg.user_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="text-[10px] font-bold text-gray-600">{msg.user_name}</span>
                          </div>
                        )}
                        <div className={`rounded-lg px-3 py-2 text-sm leading-relaxed break-words ${isMe ? 'bg-[#DCF8C6] text-[#111827] rounded-br-sm' : 'bg-white text-[#111827] rounded-bl-sm shadow-sm'}`}>
                          {msg.message && msg.message !== '📷 ' && <p>{msg.message}</p>}
                          {msg.image_url && (
                            <img src={msg.image_url} alt="img" className="mt-1 max-w-[150px] rounded-lg cursor-pointer"
                              onClick={() => window.open(msg.image_url, '_blank')} />
                          )}
                          <p className={`text-[10px] mt-0.5 ${isMe ? 'text-gray-400' : 'text-gray-400'} text-right`}>{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {aiLoading && (
                <div className="flex justify-start mb-3">
                  <div className="max-w-[85%]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-400 to-pink-500 flex items-center justify-center text-white text-[8px] font-bold">🤖</div>
                      <span className="text-[10px] font-bold text-gray-300">Asistente IA</span>
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-[#1e293b] text-gray-100 rounded-bl-sm shadow-md border border-white/5">
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {aiError && (
                <div className="text-center py-2">
                  <span className="text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-full">{aiError}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 bg-[#F0F0F0] border-t border-gray-200 flex-shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input ref={inputRef} type="text" value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder={aiMode ? 'Preguntame lo que quieras...' : (productoActivo && !verifiedWhatsapp ? 'Identifícate para chatear' : 'Escribe un mensaje...')}
                  className="flex-1 rounded-full bg-white border-0 px-4 py-2.5 text-sm outline-none shadow-sm"
                  maxLength={500}
                  disabled={!aiMode && productoActivo && !verifiedWhatsapp}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} />
                <button type="submit" disabled={!newMessage.trim() || aiLoading || (!aiMode && productoActivo && !verifiedWhatsapp)}
                  className="bg-[#075E54] text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 shadow-sm hover:bg-[#054d44] transition-colors">
                  {aiLoading ? <span className="animate-spin">⏳</span> : (aiMode ? '➤' : '➤')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showWhatsappModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={() => setShowWhatsappModal(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative w-full max-w-sm rounded-2xl p-6 bg-white shadow-2xl border-t-4 border-[#075E54]" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <span className="text-5xl block mb-3">📱</span>
              <h2 className="text-xl font-black text-[#075E54]">IDENTIFICATE</h2>
              <p className="text-xs text-gray-500 mt-1">
                Ingresá tu WhatsApp para chatear en {productoActivo ? <strong>{productoActivo.title || productoActivo.nombre}</strong> : 'el chat general'}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tu nombre</label>
                <input type="text" placeholder="Ej: Juan Perez" value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full rounded-xl p-3.5 font-bold bg-white border border-gray-200 focus:border-[#075E54] outline-none text-[#333]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tu WhatsApp (con código de país)</label>
                <input type="tel" placeholder="Ej: 5493412500029" value={userWhatsapp}
                  onChange={e => setUserWhatsapp(e.target.value)}
                  className="w-full rounded-xl p-3.5 font-bold bg-white border border-gray-200 focus:border-[#075E54] outline-none text-[#333]" />
              </div>
              <button onClick={handleVerifyWhatsapp} className="w-full bg-[#075E54] text-white font-bold py-3 rounded-xl shadow-sm hover:bg-[#054d44] transition-colors">
                ✅ IDENTIFICARME
              </button>
            </div>
            <button onClick={() => setShowWhatsappModal(false)} className="w-full mt-3 py-2 text-sm font-bold text-gray-400">Cancelar</button>
          </div>
        </div>
      )}
    </>
  );
}

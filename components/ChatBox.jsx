'use client';
import { useState, useEffect, useRef } from 'react';
import { authFetch } from '@/lib/authFetch';

export default function ChatBox({ user, productos, allBoletos, aiPromptTrigger }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [aiError, setAiError] = useState('');
  const [speakingId, setSpeakingId] = useState(null);
  const messagesEndRef = useRef(null);

  const speakText = async (text, msgId) => {
    if (speakingId === msgId) {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis?.cancel();
    setSpeakingId(null);

    const cleanText = text.replace(/[*#_`]/g, '').replace(/[🎉🎰🛒💳🎁🏆🍀🤖👋😅👇✅❌💰💬📱⏰⭐🎲🔐📲📤🎟️💪😊🔥👕💻🏠]/g, '').trim();
    if (!cleanText) return;

    setSpeakingId(msgId);

    try {
      const res = await authFetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanText })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => { setSpeakingId(null); URL.revokeObjectURL(url); };
        audio.onerror = () => { setSpeakingId(null); URL.revokeObjectURL(url); browserSpeak(cleanText, msgId); };
        await audio.play();
        return;
      }
    } catch {}

    browserSpeak(cleanText, msgId);
  };

  const browserSpeak = (text, msgId) => {
    if (!window.speechSynthesis) { setSpeakingId(null); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-AR';
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.includes('AR') || v.lang.includes('MX') || v.lang.includes('CO') || v.lang.includes('CL') || v.lang.includes('PE') || v.lang === 'es-LA');
    const anySpanish = voices.find(v => v.lang.startsWith('es'));
    utterance.voice = preferred || anySpanish || null;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Load voices (Chrome needs this)
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    // Stop speech when minimized
    if (minimized && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    }
  }, [minimized]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    if (aiPromptTrigger && minimized) {
      setMinimized(false);
    }
  }, [aiPromptTrigger]);

  useEffect(() => {
    if (!minimized && messages.length === 0) {
      setMessages([{
        id: 'ai-welcome',
        user_name: 'Asistente IA',
        message: '🎉 ¡Bienvenido! Elegí una opción:\n\n1️⃣ **Cómo comprar**\n2️⃣ **Cómo se sortea**\n3️⃣ **Medios de pago**\n4️⃣ **Ver productos**\n\nRespondé con el número o lo que quieras saber 👇',
        created_at: new Date().toISOString(),
        is_ai: true
      }]);
    }
  }, [minimized]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    if (window.speechSynthesis) { window.speechSynthesis.cancel(); setSpeakingId(null); }

    const userMsg = { id: 'user-' + Date.now(), user_name: user?.email?.split('@')[0] || 'Vos', message: newMessage, created_at: new Date().toISOString(), is_ai: false };
    setMessages(prev => [...prev, userMsg]);
    const msg = newMessage;
    setNewMessage('');
    setLoading(true);
    setAiError('');

    try {
      const prod = (productos || []).filter(p => !p.finalizado);
      const res = await authFetch('/api/chat-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          user_name: user?.email?.split('@')[0] || 'Usuario',
          productos_activos: prod.map(p => ({ id: p.id, title: p.title || p.nombre, price: p.raffle_price, vendidos: (allBoletos || []).filter(b => b.producto_id === p.id && b.estado === 'vendido').length, total: p.numbers_total || 100 }))
        })
      });
      const data = await res.json();
      if (data.response) {
        setMessages(prev => [...prev, { id: 'ai-' + Date.now(), user_name: 'Asistente IA', message: data.response, created_at: new Date().toISOString(), is_ai: true }]);
      } else {
        setAiError(data.error || 'Error al obtener respuesta');
      }
    } catch {
      setAiError('Error de conexión. Probá de nuevo.');
    }
    setLoading(false);
    scrollToBottom();
  };

  const formatTime = (d) => new Date(d).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const WHATSAPP_ADMIN = '5493412500029';

  return minimized ? null : (
        <div className="fixed inset-0 z-[80] flex items-end justify-center" onClick={() => setMinimized(true)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div
            className="relative w-full max-w-md h-[55vh] bg-white rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] text-white flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => { window.location.href = '/app'; }} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors mr-1" title="Volver a inicio">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <img src="/asistentevirtual.png" alt="Asistente" className="w-12 h-12 rounded-full flex-shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-bold text-lg leading-tight truncate">Asistente IA</h2>
                  <p className="text-xs text-white/50 truncate">Consultame lo que quieras</p>
                </div>
              </div>
              <button onClick={() => setMinimized(true)} className="p-1 hover:bg-white/20 rounded transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-gradient-to-b from-[#1a1a2e] to-[#16213e]" style={{ scrollBehavior: 'smooth' }}>
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <span className="text-5xl mb-3 block">🤖</span>
                  <p className="font-bold text-gray-400">Cargando...</p>
                </div>
              )}
              {[...messages].map((msg, i) => {
                if (msg.is_ai) {
                  return (
                    <div key={msg.id} className="flex justify-start mb-3">
                      <div className="max-w-[85%]">
                        <div className="flex items-center gap-1.5 mb-1">
                          <img src="/asistentevirtual.png" alt="Asistente" className="w-8 h-8 rounded-full" />
                          <span className="text-[10px] font-bold text-gray-400">Asistente IA</span>
                        </div>
                        <div className="rounded-lg px-3 py-2 text-sm leading-relaxed break-words bg-[#1e293b] text-gray-100 rounded-bl-sm shadow-md border border-white/5">
                          {msg.message.split('\n').map((line, j) =>
                            <p key={j} className={line.startsWith('•') ? 'ml-2' : ''}>
                              {line.split(/(https?:\/\/[^\s]+)/g).map((part, k) =>
                                part.match(/^https?:\/\//) ? <a key={k} href={part} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline hover:text-cyan-200" onClick={e => e.stopPropagation()}>{part}</a> : part
                              )}
                            </p>
                          )}
                          <p className="text-[10px] mt-1 text-gray-600 text-right">{formatTime(msg.created_at)}</p>
                        </div>
                        <div className="mt-1 flex gap-1">
                          <button onClick={() => speakText(msg.message, msg.id)}
                            className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold hover:bg-cyan-500/40 transition-colors"
                          >{speakingId === msg.id ? '🔊' : '🔈'} Escuchar</button>
                          <button onClick={() => { window.open('https://wa.me/' + WHATSAPP_ADMIN + '?text=' + encodeURIComponent('Hola! Quiero comprar números en Eco Rifas 🎉'), '_blank'); }}
                            className="text-[9px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-bold hover:bg-green-500/40 transition-colors"
                          >💬 Hablar con vendedor</button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className="flex justify-end mb-1">
                    <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm leading-relaxed break-words bg-[#DCF8C6] text-[#111827] rounded-br-sm">
                      <p>{msg.message}</p>
                      <p className="text-[10px] mt-0.5 text-gray-400 text-right">{formatTime(msg.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-start mb-3">
                  <div className="max-w-[85%]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <img src="/asistentevirtual.png" alt="Asistente" className="w-8 h-8 rounded-full" />
                      <span className="text-[10px] font-bold text-gray-400">Asistente IA</span>
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
            <div className="p-2 bg-[#1a1a2e] border-t border-white/5 flex-shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input type="text" value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Preguntame lo que quieras..."
                  className="flex-1 rounded-full bg-[#1e293b] border border-white/10 px-4 py-2.5 text-sm outline-none text-gray-100 placeholder-gray-500"
                  maxLength={500}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }} />
                <button type="submit" disabled={!newMessage.trim() || loading}
                  className="bg-gradient-to-r from-cyan-500 to-pink-500 text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-40 shadow-sm hover:scale-105 transition-transform">
                  {loading ? <span className="animate-spin">⏳</span> : '➤'}
                </button>
              </form>
            </div>
        </div>
      </div>
    );
  }

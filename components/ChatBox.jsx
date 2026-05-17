'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ChatBox({ user, onClose, isOpen }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();
    scrollToBottom();

    if (!supabase) return;
    const channel = supabase.channel('chat_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [payload.new, ...prev].slice(0, 100);
        });
        setTimeout(scrollToBottom, 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/chat?limit=50');
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.log('Error fetching chat');
    }
    setLoading(false);
  };

  const getUserName = () => {
    if (user?.user_metadata?.nombre) return user.user_metadata.nombre;
    if (user?.email) return user.email.split('@')[0];
    return 'Anónimo';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const tempMsg = newMessage;
    setNewMessage('');

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || null,
          user_name: getUserName(),
          message: tempMsg.trim()
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
            user_name: getUserName(),
            image_url: data.url,
            message: '📷 '
          })
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
    setUploading(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md h-[80vh] bg-gray-900 border border-white/10 rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-pink-600/20 to-purple-600/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="font-black text-lg">CHAT EN VIVO</h2>
            <span className="text-xs bg-pink-500/30 text-pink-300 px-2 py-0.5 rounded-full font-bold">{messages.length}</span>
          </div>
          <button onClick={onClose} className="text-2xl hover:text-pink-500 transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollBehavior: 'smooth' }}>
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl mb-3 block">💬</span>
              <p className="font-bold text-gray-400">Se el primero en escribir!</p>
              <p className="text-xs text-gray-500 mt-1">Compartí tu experiencia en las rifas</p>
            </div>
          ) : (
            [...messages].reverse().map((msg, i) => {
              const showDate = i === 0 || !isSameDay(messages[messages.length - 1 - i]?.created_at, messages[messages.length - 1 - i + 1]?.created_at);
              return (
                <div key={msg.id}>
                  {showDate && i > 0 && (
                    <div className="flex items-center gap-2 my-4">
                      <div className="flex-1 h-px bg-white/10"></div>
                      <span className="text-xs text-gray-500 font-bold">{formatDate(msg.created_at)}</span>
                      <div className="flex-1 h-px bg-white/10"></div>
                    </div>
                  )}
                  <div className="group">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                        {msg.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-pink-400 truncate">{msg.user_name}</span>
                          <span className="text-[10px] text-gray-500">{formatTime(msg.created_at)}</span>
                        </div>
                        {msg.message && msg.message !== '📷 ' && (
                          <p className="text-sm text-white mt-0.5 break-words">{msg.message}</p>
                        )}
                        {msg.image_url && (
                          <img
                            src={msg.image_url}
                            alt="Imagen compartida"
                            className="mt-1 max-w-[250px] rounded-xl border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(msg.image_url, '_blank')}
                          />
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

        <div className="p-3 border-t border-white/10 bg-gray-900">
          <form onSubmit={handleSend} className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg hover:bg-white/20 flex-shrink-0"
            >😊</button>
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Escribí un mensaje..."
              className="flex-1 rounded-xl bg-white/10 border border-white/10 px-4 py-2.5 text-sm font-bold outline-none focus:border-pink-500/50"
              maxLength={500}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg hover:bg-white/20 flex-shrink-0"
            >{uploading ? '⏳' : '📷'}</button>
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white w-10 h-10 rounded-xl font-black flex items-center justify-center disabled:opacity-50 flex-shrink-0"
            >➤</button>
          </form>
          {showEmoji && (
            <div className="flex gap-1 flex-wrap mt-2 p-2 bg-white/5 rounded-xl">
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
          <p className="text-[10px] text-gray-600 text-center mt-1.5">
            {user ? 'Habla con la comunidad!' : 'Inicia sesion para chatear'}
          </p>
        </div>
      </div>
    </div>
  );
}

function isSameDay(d1, d2) {
  if (!d1 || !d2) return true;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return date1.toDateString() === date2.toDateString();
}

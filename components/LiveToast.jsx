'use client';
import { useState, useEffect, useRef } from 'react';

const NAMES = ['María','Carlos','Lucía','Juan','Ana','Pedro','Sofía','Diego','Valentina','Lautaro','Camila','Franco','Micaela','Tomás','Florencia','Mateo','Julieta','Lucas','Martina','Nicolás','Agustín','Rocío','Emiliano','Lourdes','Fernando','Melisa','Guillermo','Candela','Hernán','Daiana'];

export default function LiveToast({ productos }) {
  const [toasts, setToasts] = useState([]);
  const idxRef = useRef(0);

    useEffect(() => {
      if (!productos?.length) return;
      const addToast = () => {
        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        const prod = productos[Math.floor(Math.random() * productos.length)];
        const num = Math.floor(Math.random() * 100) + 1;
        const id = Date.now() + idxRef.current++;
        setToasts(prev => [...prev, { id, name, product: prod.nombre || prod.title, numero: String(num).padStart(2,'0') }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
      };
      addToast();
      const t = setInterval(addToast, 60000);
      return () => clearInterval(t);
    }, [productos]);

  if (!toasts.length) return null;

  return (
    <div className="fixed top-24 right-3 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 290 }}>
      {toasts.map(t => (
        <div key={t.id} className="animate-slide-in-right bg-gradient-to-r from-gray-800/95 to-gray-900/95 backdrop-blur-sm border border-green-500/30 rounded-xl px-4 py-3 shadow-2xl pointer-events-auto">
          <p className="text-white text-xs font-bold">
            <span className="text-green-400">📱</span>{' '}
            <span className="text-green-400 font-black">{t.name}</span> reservó{' '}
            <span className="text-[#25F4EE] font-black">N° {t.numero}</span> en{' '}
            <span className="text-white/70">{t.product.length > 20 ? t.product.slice(0, 20) + '…' : t.product}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

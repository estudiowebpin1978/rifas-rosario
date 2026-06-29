'use client';
import { useState, useEffect } from 'react';
import { getConsent, setConsent, loadTrackingScripts } from '@/lib/tracking';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasConsent = localStorage.getItem('eco_rifas_consent');
    if (hasConsent === null) {
      setVisible(true);
    } else if (hasConsent === 'true') {
      loadTrackingScripts();
    }
  }, []);

  const accept = () => {
    setConsent(true);
    setVisible(false);
  };

  const reject = () => {
    setConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[99] p-4 bg-white/95 backdrop-blur-md border-t-4 border-[#FE2C55] shadow-2xl">
      <div className="max-w-lg mx-auto">
        <p className="text-xs text-gray-600 leading-relaxed mb-4">
          🍪 Esta aplicación utiliza cookies y píxeles de seguimiento de Google, Meta y TikTok 
          para medir el rendimiento de nuestras campañas publicitarias y mejorar tu experiencia.
          Al hacer clic en <strong>"Aceptar"</strong>, autorizás este uso. 
          Podés cambiar tu configuración en cualquier momento.
        </p>
        <div className="flex gap-2">
          <button onClick={reject} className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#EBEBEB] text-[#666] hover:bg-gray-200 transition-all">
            Rechazar
          </button>
          <button onClick={accept} className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#FE2C55] to-[#C12045] text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98]">
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';

const STEPS = [
  {
    emoji: '🎰',
    title: 'Elegí tu número',
    desc: 'Cada rifa tiene 100 números. Elegí el que más te guste o varios para aumentar tus chances.',
  },
  {
    emoji: '💳',
    title: 'Pagás por Mercado Pago',
    desc: 'Transferí el valor al alias que te mostramos. Usá el botón COPIAR ALIAS para no errarle.',
  },
  {
    emoji: '📸',
    title: 'Subí tu comprobante',
    desc: 'Sacale foto al comprobante y subilo. Así confirmamos tu reserva al instante.',
  },
  {
    emoji: '🏆',
    title: '¡Suerte!',
    desc: 'El sorteo es por la Quiniela Nacional Nocturna. 100% transparente. ¡El próximo ganador podés ser vos!',
  },
];

export default function OnboardingTour() {
  const [step, setStep] = useState(-1);

  useEffect(() => {
    const done = localStorage.getItem('ot_done');
    if (!done) {
      setTimeout(() => setStep(0), 800);
    }
  }, []);

  const close = () => {
    localStorage.setItem('ot_done', '1');
    setStep(-1);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else close();
  };

  if (step < 0) return null;

  const s = STEPS[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
      <div className="relative w-[90%] max-w-sm rounded-3xl p-8 bg-white shadow-2xl border-t-4 border-[#FE2C55] animate-fade-in-up">
        <div className="text-center mb-6">
          <div className="text-7xl mb-4 animate-bounce">{s.emoji}</div>
          <div className="flex justify-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-[#FE2C55] w-6' : 'bg-gray-300'}`} />
            ))}
          </div>
          <h2 className="text-2xl font-black text-[#111827] mb-2">{s.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={close} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-400 bg-gray-100 hover:bg-gray-200 transition-colors">
            Saltar
          </button>
          <button onClick={next} className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-gradient-to-r from-[#FE2C55] to-[#C12045] shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
            {step < STEPS.length - 1 ? 'Siguiente →' : '¡Empezar! 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}

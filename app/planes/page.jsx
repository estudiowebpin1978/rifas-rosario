'use client';
import { useState } from 'react';

const PLANS = [
  {
    nombre: 'Gratis',
    slug: 'free',
    precio: 0,
    comision: '15%',
    rifas: '3',
    numeros: '100 por rifa',
    features: [
      '3 rifas activas',
      '100 números por rifa',
      'Sorteo por Quiniela Nacional',
      'Notificaciones WhatsApp',
      'Página de organización',
    ],
    color: 'gray',
  },
  {
    nombre: 'Pro',
    slug: 'pro',
    precio: 14999,
    comision: '8%',
    rifas: '50',
    numeros: '200 por rifa',
    popular: true,
    features: [
      '50 rifas activas',
      '200 números por rifa',
      'Sorteo por Quiniela Nacional',
      'Notificaciones WhatsApp',
      'Página personalizada',
      'Estadísticas avanzadas',
      'Soporte prioritario',
      'Sin marca de agua',
    ],
    color: 'pink',
  },
  {
    nombre: 'Business',
    slug: 'business',
    precio: 39999,
    comision: '5%',
    rifas: 'Ilimitadas',
    numeros: '1000 por rifa',
    features: [
      'Rifas ilimitadas',
      '1000 números por rifa',
      'Sorteo por Quiniela Nacional',
      'Notificaciones WhatsApp',
      'Dominio propio',
      'Estadísticas avanzadas',
      'Soporte prioritario 24/7',
      'API completa',
      'Personalización total',
    ],
    color: 'purple',
  },
];

export default function PlanesPage() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="min-h-screen bg-[#111827]">
      <header className="px-4 pt-8 pb-6">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-3xl font-black text-white">PLANES</h1>
          <p className="text-gray-400 mt-2">Elegí el plan ideal para tu organización</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-12 space-y-4">
        {PLANS.map(plan => (
          <div
            key={plan.slug}
            onClick={() => setSelected(plan.slug)}
            className={`relative rounded-2xl p-5 border-2 transition-all cursor-pointer ${
              selected === plan.slug
                ? 'border-[#FE2C55] bg-white/5 shadow-lg shadow-[#FE2C55]/10'
                : 'border-gray-700 bg-white/5 hover:border-gray-500'
            } ${plan.popular ? 'ring-2 ring-[#FE2C55]/50' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FE2C55] text-white text-[10px] font-black px-3 py-1 rounded-full">
                MÁS POPULAR
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-white">{plan.nombre}</h3>
                <p className="text-sm text-gray-400">{plan.comision} comisión por transacción</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-white">
                  {plan.precio === 0 ? 'Gratis' : `$${plan.precio.toLocaleString('es-AR')}`}
                </p>
                {plan.precio > 0 && <p className="text-[10px] text-gray-400">/mes</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-sm font-black text-white">{plan.rifas}</p>
                <p className="text-[10px] text-gray-400">Rifas</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-sm font-black text-white">{plan.numeros}</p>
                <p className="text-[10px] text-gray-400">Números</p>
              </div>
            </div>

            <ul className="space-y-2">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-[#39B54A]">✓</span> {f}
                </li>
              ))}
            </ul>

            <button className={`w-full mt-4 py-3 rounded-xl font-black text-sm transition-all ${
              selected === plan.slug
                ? 'bg-[#FE2C55] text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}>
              {plan.precio === 0 ? 'Empezar gratis' : `Elegir ${plan.nombre}`}
            </button>
          </div>
        ))}

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">¿Necesitás algo diferente?</p>
          <a href={`https://wa.me/5493412500029?text=${encodeURIComponent('Hola! Quiero información sobre planes personalizados para mi organización')}`} target="_blank" className="text-sm text-[#FE2C55] font-bold hover:underline">
            Contactanos →
          </a>
        </div>
      </main>
    </div>
  );
}

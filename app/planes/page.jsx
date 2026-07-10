'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

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
      'Página de organización',
    ],
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
      'Página personalizada',
      'Estadísticas avanzadas',
      'Soporte prioritario',
      'Sin marca de agua',
    ],
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
      'Dominio propio',
      'Estadísticas avanzadas',
      'Soporte prioritario 24/7',
      'API completa',
      'Personalización total',
    ],
  },
];

export default function PlanesPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  const [user, setUser] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser(data.session.user);
        loadOrg(data.session.user.id);
      }
    });
  }, []);

  const loadOrg = async (userId) => {
    try {
      const res = await fetch('/api/organizaciones');
      const data = await res.json();
      const myOrg = data.organizaciones?.find(o => o.user_id === userId);
      if (myOrg) setCurrentPlan(myOrg.plan || 'free');
    } catch (e) {}
  };

  const selectPlan = async (plan) => {
    if (!user) {
      alert('Primero creá tu cuenta免费. Entrá a la app y registrate.');
      router.push('/');
      return;
    }
    if (plan.slug === currentPlan) {
      alert('Ya tenés este plan activo.');
      return;
    }
    if (plan.slug !== 'free' && plan.precio > 0) {
      const confirmar = confirm(`¿Elegir plan ${plan.nombre}?\n\nPrecio: $${plan.precio.toLocaleString('es-AR')}/mes\nComisión: ${plan.comision}\n\nLa comisión se actualizará inmediatamente.`);
      if (!confirmar) return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/organizaciones/update-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, plan_slug: plan.slug }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentPlan(plan.slug);
        alert(`✅ Plan ${plan.nombre} activado!\n\nComisión: ${plan.comision}`);
      } else {
        alert(data.error || 'Error al cambiar plan');
      }
    } catch (e) {
      alert('Error de conexión');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#111827]">
      <header className="px-4 pt-8 pb-6">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-3xl font-black text-white">PLANES</h1>
          <p className="text-gray-400 mt-2">Elegí el plan ideal para tu organización</p>
          {currentPlan && (
            <p className="text-sm text-[#39B54A] font-bold mt-2">Tu plan actual: {currentPlan.toUpperCase()}</p>
          )}
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
            } ${plan.popular ? 'ring-2 ring-[#FE2C55]/50' : ''} ${currentPlan === plan.slug ? 'ring-2 ring-[#39B54A]/50' : ''}`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FE2C55] text-white text-[10px] font-black px-3 py-1 rounded-full">
                MÁS POPULAR
              </div>
            )}
            {currentPlan === plan.slug && (
              <div className="absolute -top-3 right-4 bg-[#39B54A] text-white text-[10px] font-black px-3 py-1 rounded-full">
                ACTUAL
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

            <button
              onClick={(e) => { e.stopPropagation(); selectPlan(plan); }}
              disabled={loading || currentPlan === plan.slug}
              className={`w-full mt-4 py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50 ${
                currentPlan === plan.slug
                  ? 'bg-[#39B54A] text-white cursor-default'
                  : selected === plan.slug
                    ? 'bg-[#FE2C55] text-white hover:bg-[#C12045]'
                    : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {currentPlan === plan.slug ? '✅ Plan actual' : loading ? '⏳ Procesando...' : plan.precio === 0 ? 'Empezar gratis' : `Elegir ${plan.nombre}`}
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

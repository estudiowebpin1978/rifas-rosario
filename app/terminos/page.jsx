'use client';
import { useRouter } from 'next/navigation';

export default function TerminosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#333]">
      <header className="sticky top-0 z-50 bg-[#111827] border-b border-gray-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/10 text-white shadow-sm hover:bg-white/20 transition-colors">←</button>
          <h1 className="text-xl font-black text-[#FE2C55]">TERMINOS Y CONDICIONES</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-[#EBEBEB] shadow-sm space-y-6">
          
          <div className="bg-gradient-to-r from-[#25F4EE]/10 to-[#FE2C55]/10 rounded-xl p-4 border border-[#25F4EE]/20">
            <p className="text-sm font-bold text-[#111827]">🎯 Sorteo 100% Transparente verificado por Quiniela Nacional</p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#111827] mb-2">1. INFORMACION GENERAL</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Eco Rifas es una plataforma de rifas online. Al participar en nuestras rifas, aceptas estos terminos y condiciones.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#111827] mb-2">2. PARTICIPACION</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Para participar debes ser mayor de 18 años. Cada rifa tiene 100 numeros disponibles. Podes comprar uno o mas numeros. 
              Cuantos mas numeros compres, mayores son tus posibilidades de ganar.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#111827] mb-2">3. METODO DE PAGO</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Los pagos se realizan por transferencia bancaria al alias <strong className="text-[#111827]">eco-rifas</strong>. 
              Una vez realizado el pago, debes enviar el comprobante para confirmar tu reserva.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#111827] mb-2">4. SORTEO TRANSPARENTE</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Todos los sorteos se realizan usando las ultimas 2 cifras de la cabeza del sorteo <strong>Nocturna (21hs)</strong> de la <strong>Quiniela Nacional</strong>. 
              Este metodo es 100% transparente y verificable por cualquier participante. 
              El resultado del sorteo de la Quiniela Nacional es de dominio publico.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#111827] mb-2">5. RECLAMO DE PREMIOS</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Los ganadores son notificados via WhatsApp al numero registrado. 
              El premio debe reclamarse dentro de los 30 dias posteriores al sorteo. 
              Pasado ese plazo se considera premio no reclamado.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#111827] mb-2">6. ENTREGA DE PREMIOS</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              La entrega de premios se coordina directamente con el ganador por WhatsApp. 
              Los costos de envio corren por cuenta del organizador dentro del territorio argentino.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#111827] mb-2">7. PRIVACIDAD</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Tus datos personales (nombre, WhatsApp) solo se usan para los fines de la rifa y no se comparten con terceros. 
              Al participar aceptas que tu nombre y numero ganador se publiquen en nuestra plataforma.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#111827] mb-2">8. CANCELACIONES Y DEVOLUCIONES</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Una vez confirmado el pago no se realizan devoluciones. 
              Si el sorteo no se realiza por causas ajenas se coordina la devolucion del monto pagado.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#111827] mb-2">9. CONTACTO</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Ante cualquier consulta contactanos por WhatsApp o por el chat de la aplicacion.
            </p>
          </div>
        </div>

        <button onClick={() => router.back()} className="w-full bg-gradient-to-r from-[#FE2C55] to-[#C12045] text-black font-black py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]">
          ✅ ACEPTO Y VOLVER
        </button>
      </main>
    </div>
  );
}

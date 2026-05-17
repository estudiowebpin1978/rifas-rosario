'use client';
import { useRouter } from 'next/navigation';

export default function TerminosPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#333]">
      <header className="sticky top-0 z-50 bg-[#FFE600] border-b border-yellow-300 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg bg-white/80 text-[#333] shadow-sm hover:bg-white transition-colors">←</button>
          <h1 className="text-xl font-black text-[#1A3C6D]">TERMINOS Y CONDICIONES</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-[#EBEBEB] shadow-sm space-y-6">
          
          <div>
            <h2 className="font-black text-lg text-[#1A3C6D] mb-2">1. INFORMACION GENERAL</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Mercado Rifas es una plataforma de rifas online. Al participar en nuestras rifas, aceptas los siguientes terminos y condiciones.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#1A3C6D] mb-2">2. PARTICIPACION</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Para participar, debes ser mayor de 18 años. Cada rifa tiene 100 numeros disponibles. Podes comprar uno o mas numeros. 
              Cuantos mas numeros compres, mayores son tus posibilidades de ganar.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#1A3C6D] mb-2">3. METODO DE PAGO</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Los pagos se realizan exclusivamente a traves de Mercado Pago al alias proporcionado. 
              Una vez realizado el pago, deberas enviar el comprobante para confirmar tu reserva.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#1A3C6D] mb-2">4. SORTEO TRANSPARENTE</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Todos los sorteos se realizan utilizando las ultimas 2 cifras de la cabeza del sorteo Nocturna (21hs) de la Quiniela Nacional. 
              Este metodo es 100% transparente y verificable por cualquier participante. 
              El resultado del sorteo de la Quiniela Nacional es de dominio publico.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#1A3C6D] mb-2">5. RECLAMO DE PREMIOS</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Los ganadores seran notificados via WhatsApp al numero registrado. 
              El premio debe ser reclamado dentro de los 30 dias posteriores al sorteo. 
              Pasado ese plazo, se considerara como premio no reclamado.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#1A3C6D] mb-2">6. ENTREGA DE PREMIOS</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              La entrega de los premios se coordina directamente con el ganador a traves de WhatsApp. 
              Los costos de envio corren por cuenta del organizador dentro del territorio argentino.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#1A3C6D] mb-2">7. PRIVACIDAD</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Tus datos personales (nombre, WhatsApp) solo se utilizan para los fines de la rifa y no seran compartidos con terceros. 
              Al participar, aceptas que tu nombre y numero ganador sean publicados en nuestra plataforma.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#1A3C6D] mb-2">8. CANCELACIONES Y DEVOLUCIONES</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Una vez confirmado el pago, no se realizan devoluciones. 
              Si el sorteo no se realiza por causas ajenas a nuestra voluntad, se coordinara la devolucion del monto pagado.
            </p>
          </div>

          <div>
            <h2 className="font-black text-lg text-[#1A3C6D] mb-2">9. CONTACTO</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Ante cualquier consulta, podes contactarnos a traves de nuestro WhatsApp o por el chat de la aplicacion.
            </p>
          </div>
        </div>

        <button onClick={() => router.back()} className="w-full bg-[#3483FA] text-white font-black py-4 rounded-2xl shadow-lg">
          VOLVER
        </button>
      </main>
    </div>
  );
}

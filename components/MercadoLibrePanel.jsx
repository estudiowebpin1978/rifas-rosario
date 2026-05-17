'use client';
import { useState } from 'react';
import confetti from 'canvas-confetti';

const CATEGORIAS_ML = [
  { id: 1, nombre: 'Tecnologia', emoji: '💻' },
  { id: 2, nombre: 'Hogar y Muebles', emoji: '🏠' },
  { id: 3, nombre: 'Electrodomesticos', emoji: '⚡' },
  { id: 4, nombre: 'Herramientas', emoji: '🔧' },
  { id: 5, nombre: 'Deportes', emoji: '⚽' },
  { id: 6, nombre: 'Indumentaria', emoji: '👕' },
  { id: 7, nombre: 'Juegos y Juguetes', emoji: '🎮' },
  { id: 8, nombre: 'Belleza y Cuidado Personal', emoji: '💄' },
  { id: 9, nombre: 'Servicios', emoji: '🎯' },
  { id: 10, nombre: 'Bazar', emoji: '🎪' },
  { id: 11, nombre: 'Celulares', emoji: '📱' },
  { id: 12, nombre: 'Zapatillas', emoji: '👟' }
];

export default function MercadoLibrePanel({ categorias }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const [showImportModal, setShowImportModal] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/mercadolibre?q=${encodeURIComponent(search)}&limit=24`);
      const data = await res.json();
      if (data.products) {
        setResults(data.products);
      } else {
        setError(data.error || 'Error al buscar');
      }
    } catch (err) {
      setError('Error de conexion');
    }
    setLoading(false);
  };

  const handleImport = async (product) => {
    if (!selectedCategoria) {
      alert('Selecciona una categoria para importar');
      return;
    }

    setImporting(product.ml_id);

    try {
      const res = await fetch('/api/mercadolibre', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.nombre,
          raffle_price: parseFloat(product.precio.replace(/[^\d.,]/g,'').replace(',','.')) || 0,
          price: parseFloat(product.precio_original?.replace(/[^\d.,]/g,'').replace(',','.')) || 0,
          image: product.imagen,
          description: product.nombre,
          categoria_id: selectedCategoria,
          ml_url: product.permalink
        })
      });

      const data = await res.json();

      if (data.success) {
        confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
        setShowImportModal(null);
        setResults([]);
        setSearch('');
        alert(`✅ Rifa creada: ${product.nombre}\n\n100 numeros generados!`);
        window.location.reload();
      } else {
        alert('Error: ' + (data.error || 'Error desconocido'));
      }
    } catch (err) {
      alert('Error al importar');
    }
    setImporting(null);
  };

  const sugerencias = [
    'zapatillas nike', 'iphone', 'samsung galaxy', 'smart tv',
    'aire acondicionado', 'notebook', 'bicicleta', 'perfume',
    'monitor', 'playstation', 'taladro', 'cafetera'
  ];

  return (
    <div className="rounded-lg bg-white border border-[#EBEBEB] p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🛒</span>
        <h2 className="font-black text-lg text-[#1A3C6D]">IMPORTAR DE MERCADO LIBRE</h2>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Busca productos populares en Mercado Libre y crealos como rifa con un solo click.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar en Mercado Libre..."
          className="flex-1 rounded-lg bg-white border border-[#EBEBEB] p-3 font-bold text-sm outline-none focus:border-[#3483FA] text-[#333]"
        />
        <button
          type="submit"
          disabled={loading || !search.trim()}
          className="bg-[#3483FA] text-white px-5 rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-[#2d6fd4] transition-colors"
        >
          {loading ? '⏳' : '🔍'}
        </button>
      </form>

      <div className="flex gap-1.5 flex-wrap mb-3">
        {sugerencias.map(sug => (
          <button
            key={sug}
            onClick={() => { setSearch(sug); setTimeout(() => document.querySelector('form')?.requestSubmit(), 100); }}
            className="text-xs bg-[#F5F5F5] hover:bg-[#EBEBEB] text-[#666] px-2.5 py-1 rounded font-bold transition-colors border border-[#EBEBEB]"
          >
            {sug}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className="text-xs text-gray-500 font-bold py-1">Categoria para importar:</span>
        {CATEGORIAS_ML.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoria(cat.id)}
            className={`text-xs px-2.5 py-1 rounded font-bold transition-all ${selectedCategoria === cat.id ? 'bg-[#3483FA] text-white' : 'bg-[#F5F5F5] text-[#666] hover:bg-[#EBEBEB] border border-[#EBEBEB]'}`}
          >
            {cat.emoji} {cat.nombre}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-3">{error}</div>
      )}

      {results.length > 0 && (
        <div className="max-h-[500px] overflow-y-auto space-y-2">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-bold text-[#3483FA]">{results.length} productos encontrados</p>
            <button
              onClick={() => { setResults([]); setSearch(''); }}
              className="text-xs text-gray-500 hover:text-[#333]"
            >✕ Cerrar</button>
          </div>
          {results.map(product => (
            <div
              key={product.ml_id}
              className="bg-[#F5F5F5] rounded-lg p-3 flex gap-3 items-center hover:bg-[#EBEBEB] transition-colors border border-[#EBEBEB]"
            >
              <img
                src={product.imagen}
                alt={product.nombre}
                className="w-16 h-16 object-contain rounded-lg bg-white flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm truncate text-[#333]">{product.nombre}</h4>
                <p className="text-[#39B54A] font-black text-sm">{product.precio}</p>
                <p className="text-[10px] text-gray-500">
                  {product.vendidos > 0 && `🔥 ${product.vendidos} vendidos`}
                  {product.ubicacion && ` · ${product.ubicacion}`}
                </p>
              </div>
              <button
                onClick={() => handleImport(product)}
                disabled={importing === product.ml_id || !selectedCategoria}
                className="bg-[#3483FA] text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex-shrink-0 hover:bg-[#2d6fd4] transition-colors"
              >
                {importing === product.ml_id ? '⏳' : '⬇ Importar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl mb-2 block">🛍️</span>
          <p className="text-sm font-bold">Busca productos para importar</p>
          <p className="text-xs mt-1">Usa el buscador o hace click en una sugerencia</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <span className="text-3xl animate-bounce block mb-2">🔍</span>
          <p className="text-sm text-gray-500">Buscando en Mercado Libre...</p>
        </div>
      )}
    </div>
  );
}

export async function GET() {
  try {
    const response = await fetch('https://loteria-santandina-loteria.com.ar/api/loteria/loteriesultimo.php', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (response.ok) {
      const html = await response.text();
      const match = html.match(/ Quiniela\s+[\w\s]+:\s*(\d{2,4})/i) || html.match(/(\d{2,4})\s*$/);
      const lastNumber = match ? match[1].slice(-2) : null;
      
      if (lastNumber) {
        return Response.json({
          success: true,
          numero: parseInt(lastNumber),
          source: 'quiniela_santandina',
          timestamp: Date.now()
        });
      }
    }
    
    return Response.json({
      success: false,
      source: 'random_fallback',
      seed: Date.now().toString(),
      timestamp: Date.now()
    });
  } catch (err) {
    return Response.json({
      success: false,
      source: 'error_fallback',
      seed: Date.now().toString(),
      timestamp: Date.now()
    });
  }
}
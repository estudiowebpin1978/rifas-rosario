import './globals.css'

export const metadata = {
  metadataBase: new URL('https://eco-rifas.vercel.app'),
  title: 'Eco Rifas - Los productos que amas, ahora los podes ganar en rifas economicas!',
  description: '🔥 Participá en rifas transparentes con premios increibles. Sorteo por Quiniela Nacional. Elegí tus números de la suerte y ganá productos que amas.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Eco Rifas',
  },
  openGraph: {
    title: 'Eco Rifas - Ganá los productos que amas',
    description: '🔥 Participá en rifas transparentes con premios increibles. Sorteo por Quiniela Nacional. Elegí tu número de la suerte y ganá!',
    url: 'https://eco-rifas.vercel.app',
    siteName: 'Eco Rifas',
    images: [{ url: '/logo.png', width: 512, height: 512 }],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eco Rifas - Ganá los productos que amas',
    description: '🔥 Participá en rifas transparentes con premios increibles. Sorteo por Quiniela Nacional.',
    images: ['/logo.png'],
  },
  other: {
    'google-site-verification': 'jkL3am77s8I6GSyhTtXWRP8b1f2ORInPYZEWAdjUA8U',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="transition-colors antialiased bg-[#F5F5F5]">
        {children}
      </body>
    </html>
  )
}

export const metadata = {
  title: 'Ganadores - Eco Rifas | Últimos premios entregados',
  description: 'Conocé a los últimos ganadores de nuestras rifas. Sumate al próximo sorteo y participá para ganar!',
  openGraph: {
    title: 'Ganadores - Eco Rifas',
    description: 'Últimos ganadores de nuestras rifas. El próximo podrías ser vos!',
    url: 'https://eco-rifas.vercel.app/feed',
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
  },
}

export default function FeedLayout({ children }) {
  return children
}

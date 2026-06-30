import AppPage from '@/components/AppPage'

export const metadata = {
  title: 'Todas las rifas - Eco Rifas | Participá y ganá',
  description: 'Elegí tu producto favorito, seleccioná tus números y participá en rifas transparentes con sorteo por Quiniela Nacional.',
  openGraph: {
    title: 'Eco Rifas - Todas las rifas disponibles',
    description: 'Elegí tu producto favorito y participá en rifas transparentes con sorteo por Quiniela Nacional.',
    url: 'https://eco-rifas.vercel.app/app',
    images: [{ url: '/og-image.svg', width: 1200, height: 630 }],
  },
}

export default function App() {
  return <AppPage />
}
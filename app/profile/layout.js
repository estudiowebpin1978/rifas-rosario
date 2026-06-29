export const metadata = {
  title: 'Mi Perfil - Eco Rifas',
  description: 'Tu perfil en Eco Rifas: historial de participaciones, premios ganados y estadísticas.',
  openGraph: {
    title: 'Mi Perfil - Eco Rifas',
    description: 'Tu historial de participaciones y premios en Eco Rifas.',
    url: 'https://eco-rifas.vercel.app/profile',
    images: [{ url: '/logo.png', width: 1200, height: 630 }],
  },
}

export default function ProfileLayout({ children }) {
  return children
}

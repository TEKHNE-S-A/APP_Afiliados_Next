import type { Metadata } from 'next'
import { CartillaDetail } from '@/components/cartilla/cartilla-detail'

export const metadata: Metadata = { title: 'Detalle Cartilla' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function CartillaDetailPage({ params }: Props) {
  const { id } = await params
  return <CartillaDetail id={id} />
}

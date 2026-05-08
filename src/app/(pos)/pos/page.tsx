import { PosInterface } from '@/components/pos/pos-interface'

export default async function PosPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams
  return <PosInterface initialOrderId={order} />
}

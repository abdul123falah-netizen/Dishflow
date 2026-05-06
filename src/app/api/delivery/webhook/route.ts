import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import crypto from 'crypto'

// Deliverect channel name → display name mapping
const CHANNEL_MAP: Record<string, string> = {
  talabat: 'Talabat',
  careem: 'Careem',
  careemfood: 'Careem',
  noon: 'Noon Food',
  noonfood: 'Noon Food',
  deliveroo: 'Deliveroo',
  hungerstation: 'HungerStation',
  jahez: 'Jahez',
  keeta: 'Keeta',
  mrspeedy: 'Mr. Speedy',
  other: 'Other',
}

function resolveChannel(raw: string): string {
  return CHANNEL_MAP[raw?.toLowerCase().replace(/\s/g, '')] ?? raw ?? 'Delivery'
}

function verifySignature(body: string, secret: string, header: string | null): boolean {
  if (!header) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header))
}

export async function POST(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get('rid')
  if (!restaurantId) {
    return NextResponse.json({ error: 'Missing restaurant id' }, { status: 400 })
  }

  const rawBody = await req.text()
  const supabase = createServiceClient()

  // Fetch integration config
  const { data: integration, error: intError } = await supabase
    .from('restaurant_integrations')
    .select('webhook_secret, is_enabled')
    .eq('restaurant_id', restaurantId)
    .eq('provider', 'deliverect')
    .single()

  if (intError || !integration) {
    return NextResponse.json({ error: 'Integration not configured' }, { status: 404 })
  }

  if (!integration.is_enabled) {
    return NextResponse.json({ error: 'Integration disabled' }, { status: 403 })
  }

  // Verify signature
  const sig = req.headers.get('x-deliverect-hash') ?? req.headers.get('x-signature')
  if (integration.webhook_secret) {
    if (!verifySignature(rawBody, integration.webhook_secret, sig)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Map Deliverect payload → Dishflow order
  const channelName = resolveChannel(payload.channelName as string)
  const extOrderId = (payload.channelOrderDisplayId ?? payload.channelOrderId ?? '') as string
  const remarks = (payload.remarks ?? '') as string
  const customer = payload.customer as Record<string, string> | undefined
  const deliveryAddress = payload.deliveryAddress as Record<string, string> | undefined

  const address = deliveryAddress
    ? [deliveryAddress.street, deliveryAddress.city].filter(Boolean).join(', ')
    : undefined

  const notes = [
    customer?.name ? `Customer: ${customer.name}` : '',
    customer?.phoneNumber ? `Tel: ${customer.phoneNumber}` : '',
    remarks,
  ].filter(Boolean).join(' · ') || undefined

  // Prices from Deliverect are in cents — convert to major unit
  const toCurrency = (v: number) => Math.round(v) / 100

  const totalPrice = toCurrency((payload.totalPrice as number) ?? 0)
  const subTotal = toCurrency((payload.subTotal as number) ?? totalPrice)

  // Generate order number
  const { data: orderNum } = await supabase.rpc('generate_order_number', {
    p_restaurant_id: restaurantId,
  })

  // Insert order
  const { data: newOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      restaurant_id: restaurantId,
      order_number: orderNum,
      order_type: 'delivery',
      status: 'confirmed',
      payment_status: 'unpaid',
      subtotal: subTotal,
      vat_rate: 0,
      vat_amount: 0,
      total_amount: totalPrice,
      discount_amount: 0,
      discount_value: 0,
      delivery_address: address ?? null,
      delivery_notes: `PLATFORM:${channelName}|EXT_ID:${extOrderId}`,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (orderErr || !newOrder) {
    console.error('Order insert failed:', orderErr)
    return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })
  }

  // Insert order items
  const rawItems = (payload.items as Record<string, unknown>[]) ?? []
  if (rawItems.length > 0) {
    const itemsToInsert = rawItems.map(item => ({
      order_id: newOrder.id,
      restaurant_id: restaurantId,
      item_name: (item.name as string) ?? 'Unknown item',
      unit_price: toCurrency((item.price as number) ?? 0),
      quantity: (item.quantity as number) ?? 1,
      notes: (item.remarks as string) || null,
      line_total: toCurrency((item.price as number) ?? 0) * ((item.quantity as number) ?? 1),
    }))

    const { data: insertedItems, error: itemsErr } = await supabase
      .from('order_items')
      .insert(itemsToInsert)
      .select()

    if (!itemsErr && insertedItems) {
      // Insert sub-items (modifiers) per item
      for (let i = 0; i < rawItems.length; i++) {
        const subItems = (rawItems[i].subItems as Record<string, unknown>[]) ?? []
        if (subItems.length > 0 && insertedItems[i]) {
          await supabase.from('order_item_modifiers').insert(
            subItems.map(sub => ({
              order_item_id: insertedItems[i].id,
              modifier_name: (sub.name as string) ?? '',
              price: toCurrency((sub.price as number) ?? 0),
            }))
          )
        }
      }
    }
  }

  return NextResponse.json({ success: true, orderId: newOrder.id })
}

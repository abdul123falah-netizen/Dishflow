import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
export type InventoryItem = {
  id: string
  restaurant_id: string
  name: string
  category: string
  unit: string
  current_stock: number
  min_stock: number
  cost_per_unit: number
  supplier: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PurchaseOrderItem = {
  id?: string
  purchase_order_id?: string
  inventory_item_id: string | null
  item_name: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
}

export type PurchaseOrder = {
  id: string
  restaurant_id: string
  order_number: string
  supplier_name: string | null
  status: 'draft' | 'sent' | 'received' | 'cancelled'
  total_amount: number
  notes: string | null
  expected_date: string | null
  received_at: string | null
  created_at: string
  items: PurchaseOrderItem[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function stockStatus(item: InventoryItem): 'ok' | 'low' | 'out' {
  if (Number(item.current_stock) <= 0) return 'out'
  if (Number(item.current_stock) <= Number(item.min_stock)) return 'low'
  return 'ok'
}

export const INVENTORY_CATEGORIES = [
  { value: 'produce',   label: 'Produce' },
  { value: 'meat',      label: 'Meat & Poultry' },
  { value: 'seafood',   label: 'Seafood' },
  { value: 'dairy',     label: 'Dairy & Eggs' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'dry_goods', label: 'Dry Goods' },
  { value: 'spices',    label: 'Spices & Herbs' },
  { value: 'cleaning',  label: 'Cleaning' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'other',     label: 'Other' },
]

export const INVENTORY_UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'box', 'bag', 'can', 'bottle', 'dozen']

// ─── Inventory Hooks ──────────────────────────────────────────────────────────
export function useInventoryItems() {
  const supabase = createClient()
  return useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

export function useAddInventoryItem() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'restaurant_id' | 'is_active' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('restaurant_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Not found')
      const { error } = await supabase.from('inventory_items').insert({ ...item, restaurant_id: profile.restaurant_id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

export function useUpdateInventoryItem() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => {
      const { error } = await supabase
        .from('inventory_items')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

export function useAdjustStock() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, delta, current }: { id: string; delta: number; current: number }) => {
      const newStock = Math.max(0, Number(current) + delta)
      const { error } = await supabase
        .from('inventory_items')
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

export function useDeleteInventoryItem() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_items').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

// ─── Purchase Order Hooks ─────────────────────────────────────────────────────
export function usePurchaseOrders() {
  const supabase = createClient()
  return useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, items:purchase_order_items(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PurchaseOrder[]
    },
    staleTime: 15000,
  })
}

export function useCreatePurchaseOrder() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      supplier_name, notes, expected_date, items,
    }: {
      supplier_name?: string; notes?: string; expected_date?: string
      items: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id'>[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('restaurant_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Not found')

      const total_amount = items.reduce((s, i) => s + Number(i.total_cost), 0)
      const order_number = `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`

      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({ restaurant_id: profile.restaurant_id, order_number, supplier_name, notes, expected_date, total_amount, status: 'draft' })
        .select().single()
      if (poErr) throw poErr

      if (items.length > 0) {
        const { error: itemsErr } = await supabase
          .from('purchase_order_items')
          .insert(items.map(item => ({ ...item, purchase_order_id: po.id })))
        if (itemsErr) throw itemsErr
      }
      return po
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
  })
}

export function useUpdatePOStatus() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PurchaseOrder['status'] }) => {
      const updates: Record<string, unknown> = { status }
      if (status === 'received') updates.received_at = new Date().toISOString()
      const { error } = await supabase.from('purchase_orders').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useReceivePurchaseOrder() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (po: PurchaseOrder) => {
      // Mark as received
      const { error: poErr } = await supabase
        .from('purchase_orders')
        .update({ status: 'received', received_at: new Date().toISOString() })
        .eq('id', po.id)
      if (poErr) throw poErr

      // Update stock for each linked inventory item
      for (const item of po.items) {
        if (!item.inventory_item_id) continue
        const { data: inv } = await supabase
          .from('inventory_items')
          .select('current_stock')
          .eq('id', item.inventory_item_id)
          .single()
        if (!inv) continue
        await supabase
          .from('inventory_items')
          .update({
            current_stock: Number(inv.current_stock) + Number(item.quantity),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.inventory_item_id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

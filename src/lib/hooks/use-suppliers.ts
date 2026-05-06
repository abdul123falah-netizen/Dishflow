import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Supplier = {
  id: string
  restaurant_id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  payment_terms: string
  notes: string | null
  is_active: boolean
  created_at: string
}

export type RfqItem = {
  id?: string
  rfq_id?: string
  inventory_item_id: string | null
  item_name: string
  quantity: number
  unit: string
}

export type RfqResponseItem = {
  id?: string
  rfq_response_id?: string
  rfq_item_id: string
  unit_price: number
  total_price: number
}

export type RfqResponse = {
  id: string
  rfq_id: string
  supplier_id: string
  status: 'pending' | 'quoted' | 'declined'
  notes: string | null
  quoted_at: string | null
  supplier?: Supplier
  items: RfqResponseItem[]
}

export type Rfq = {
  id: string
  restaurant_id: string
  rfq_number: string
  status: 'draft' | 'sent' | 'quoted' | 'closed'
  notes: string | null
  required_by: string | null
  created_at: string
  items: RfqItem[]
  responses: RfqResponse[]
}

export type PoTemplateItem = {
  id?: string
  template_id?: string
  inventory_item_id: string | null
  item_name: string
  quantity: number
  unit: string
  unit_cost: number
}

export type PoTemplate = {
  id: string
  restaurant_id: string
  name: string
  supplier_id: string | null
  notes: string | null
  created_at: string
  supplier?: Supplier
  items: PoTemplateItem[]
}

export const PAYMENT_TERMS = [
  { value: 'cod',    label: 'Cash on Delivery' },
  { value: 'prepaid',label: 'Prepaid' },
  { value: 'net15',  label: 'Net 15' },
  { value: 'net30',  label: 'Net 30' },
  { value: 'net45',  label: 'Net 45' },
  { value: 'net60',  label: 'Net 60' },
]

// ─── Supplier Hooks ───────────────────────────────────────────────────────────
export function useSuppliers() {
  const supabase = createClient()
  return useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    staleTime: 30000,
  })
}

export function useAddSupplier() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (s: Omit<Supplier, 'id' | 'restaurant_id' | 'is_active' | 'created_at'>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('restaurant_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Not found')
      const { error } = await supabase.from('suppliers').insert({ ...s, restaurant_id: profile.restaurant_id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useUpdateSupplier() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Supplier> }) => {
      const { error } = await supabase.from('suppliers').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

export function useDeleteSupplier() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  })
}

// ─── RFQ Hooks ────────────────────────────────────────────────────────────────
export function useRfqs() {
  const supabase = createClient()
  return useQuery<Rfq[]>({
    queryKey: ['rfqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfqs')
        .select('*, items:rfq_items(*), responses:rfq_responses(*, supplier:suppliers(*), items:rfq_response_items(*))')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Rfq[]
    },
    staleTime: 15000,
  })
}

export function useCreateRfq() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      notes, required_by, items, supplier_ids,
    }: {
      notes?: string; required_by?: string
      items: Omit<RfqItem, 'id' | 'rfq_id'>[]
      supplier_ids: string[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('restaurant_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Not found')

      const rfq_number = `RFQ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`

      const { data: rfq, error: rfqErr } = await supabase
        .from('rfqs')
        .insert({ restaurant_id: profile.restaurant_id, rfq_number, notes, required_by, status: 'draft' })
        .select().single()
      if (rfqErr) throw rfqErr

      if (items.length > 0) {
        const { error: itemsErr } = await supabase.from('rfq_items')
          .insert(items.map(i => ({ ...i, rfq_id: rfq.id })))
        if (itemsErr) throw itemsErr
      }

      if (supplier_ids.length > 0) {
        const { error: respErr } = await supabase.from('rfq_responses')
          .insert(supplier_ids.map(sid => ({ rfq_id: rfq.id, supplier_id: sid, status: 'pending' })))
        if (respErr) throw respErr
      }

      return rfq
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rfqs'] }),
  })
}

export function useUpdateRfqStatus() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Rfq['status'] }) => {
      const { error } = await supabase.from('rfqs').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rfqs'] }),
  })
}

export function useSaveQuote() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      response_id, items, notes,
    }: {
      response_id: string
      items: { rfq_item_id: string; unit_price: number; total_price: number }[]
      notes?: string
    }) => {
      // Update response status to quoted
      const { error: rErr } = await supabase.from('rfq_responses')
        .update({ status: 'quoted', notes, quoted_at: new Date().toISOString() })
        .eq('id', response_id)
      if (rErr) throw rErr

      // Delete old response items and re-insert
      await supabase.from('rfq_response_items').delete().eq('rfq_response_id', response_id)
      if (items.length > 0) {
        const { error: iErr } = await supabase.from('rfq_response_items')
          .insert(items.map(i => ({ ...i, rfq_response_id: response_id })))
        if (iErr) throw iErr
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rfqs'] }),
  })
}

export function useDeclineQuote() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (response_id: string) => {
      const { error } = await supabase.from('rfq_responses')
        .update({ status: 'declined' }).eq('id', response_id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rfqs'] }),
  })
}

// ─── PO Template Hooks ────────────────────────────────────────────────────────
export function usePoTemplates() {
  const supabase = createClient()
  return useQuery<PoTemplate[]>({
    queryKey: ['po-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_templates')
        .select('*, supplier:suppliers(*), items:po_template_items(*)')
        .order('name', { ascending: true })
      if (error) throw error
      return (data ?? []) as PoTemplate[]
    },
    staleTime: 30000,
  })
}

export function useCreatePoTemplate() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      name, supplier_id, notes, items,
    }: {
      name: string; supplier_id?: string; notes?: string
      items: Omit<PoTemplateItem, 'id' | 'template_id'>[]
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('restaurant_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Not found')

      const { data: tmpl, error: tErr } = await supabase
        .from('po_templates')
        .insert({ restaurant_id: profile.restaurant_id, name, supplier_id: supplier_id || null, notes })
        .select().single()
      if (tErr) throw tErr

      if (items.length > 0) {
        const { error: iErr } = await supabase.from('po_template_items')
          .insert(items.map(i => ({ ...i, template_id: tmpl.id })))
        if (iErr) throw iErr
      }
      return tmpl
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po-templates'] }),
  })
}

export function useDeletePoTemplate() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('po_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['po-templates'] }),
  })
}

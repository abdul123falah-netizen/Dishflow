import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/types'

export function useCustomers(search?: string, tag?: string) {
  const supabase = createClient()

  return useQuery<Customer[]>({
    queryKey: ['customers', search, tag],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('last_order_at', { ascending: false, nullsFirst: false })

      if (tag && tag !== 'all') {
        query = query.eq('tag', tag)
      }
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
    staleTime: 30000,
  })
}

export function useCustomer(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, order_type, status, total_amount, created_at')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(20)

      return { customer: customer as Customer, orders: orders ?? [] }
    },
    enabled: !!id,
  })
}

export function useUpdateCustomer() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Customer> }) => {
      const { error } = await supabase.from('customers').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['customer', vars.id] })
    },
  })
}

export function useUpsertCustomer() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (customer: Partial<Customer> & { restaurant_id: string }) => {
      if (customer.phone) {
        // Try to find existing customer by phone
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('restaurant_id', customer.restaurant_id)
          .eq('phone', customer.phone)
          .single()

        if (existing) {
          const { data } = await supabase
            .from('customers')
            .update({ full_name: customer.full_name, email: customer.email, address: customer.address })
            .eq('id', existing.id)
            .select()
            .single()
          return data
        }
      }

      const { data, error } = await supabase
        .from('customers')
        .insert(customer)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

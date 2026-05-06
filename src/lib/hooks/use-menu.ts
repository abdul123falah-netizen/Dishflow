import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { MenuCategory, MenuItem } from '@/types'

export function useMenuCategories() {
  const supabase = createClient()

  return useQuery<MenuCategory[]>({
    queryKey: ['menu-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    staleTime: 60000,
  })
}

export function useMenuItems(categoryId?: string) {
  const supabase = createClient()

  return useQuery<MenuItem[]>({
    queryKey: ['menu-items', categoryId],
    queryFn: async () => {
      let query = supabase
        .from('menu_items')
        .select(`
          *,
          category:menu_categories(id, name, name_ar),
          variants:item_variants(*),
          modifiers:item_modifiers(*)
        `)
        .order('sort_order', { ascending: true })

      if (categoryId) {
        query = query.eq('category_id', categoryId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data as MenuItem[]) ?? []
    },
    staleTime: 60000,
  })
}

export function useAllMenuItems() {
  const supabase = createClient()

  return useQuery<MenuItem[]>({
    queryKey: ['menu-items-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:menu_categories(id, name, name_ar),
          variants:item_variants(*),
          modifiers:item_modifiers(*)
        `)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data as MenuItem[]) ?? []
    },
    staleTime: 60000,
  })
}

export function useCreateMenuItem() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (item: Partial<MenuItem>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('restaurant_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Profile not found')

      const { data, error } = await supabase
        .from('menu_items')
        .insert({ ...item, restaurant_id: profile.restaurant_id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-items'] }),
  })
}

export function useUpdateMenuItem() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MenuItem> }) => {
      const { error } = await supabase.from('menu_items').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-items'] })
      qc.invalidateQueries({ queryKey: ['menu-items-all'] })
    },
  })
}

export function useDeleteMenuItem() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-items'] }),
  })
}

export function useToggleItemAvailability() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase.from('menu_items').update({ is_available }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-items'] })
      qc.invalidateQueries({ queryKey: ['menu-items-all'] })
    },
  })
}

export function useCreateCategory() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (cat: Partial<MenuCategory>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: profile } = await supabase.from('users').select('restaurant_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Profile not found')

      const { data, error } = await supabase
        .from('menu_categories')
        .insert({ ...cat, restaurant_id: profile.restaurant_id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-categories'] }),
  })
}

export function useDeleteCategory() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('menu_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu-categories'] }),
  })
}

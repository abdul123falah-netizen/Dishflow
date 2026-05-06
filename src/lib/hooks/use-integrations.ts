import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface Integration {
  id: string
  restaurant_id: string
  provider: string
  webhook_secret: string | null
  is_enabled: boolean
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export function useIntegrations() {
  const supabase = createClient()
  return useQuery<Integration[]>({
    queryKey: ['integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_integrations')
        .select('*')
        .order('provider')
      if (error) throw error
      return (data as Integration[]) ?? []
    },
  })
}

export function useSaveIntegration() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      provider,
      webhook_secret,
      is_enabled,
    }: {
      provider: string
      webhook_secret: string
      is_enabled: boolean
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('users')
        .select('restaurant_id')
        .eq('auth_id', user.id)
        .single()
      if (!profile) throw new Error('Profile not found')

      const { error } = await supabase
        .from('restaurant_integrations')
        .upsert({
          restaurant_id: profile.restaurant_id,
          provider,
          webhook_secret,
          is_enabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'restaurant_id,provider' })

      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations'] }),
  })
}

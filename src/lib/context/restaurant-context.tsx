'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant, User } from '@/types'

interface RestaurantContextType {
  restaurant: Restaurant | null
  currentUser: User | null
  loading: boolean
  refetch: () => void
}

const RestaurantContext = createContext<RestaurantContextType>({
  restaurant: null,
  currentUser: null,
  loading: true,
  refetch: () => {},
})

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function load() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { setLoading(false); return }

    const { data: userProfile } = await supabase
      .from('users')
      .select('*, restaurant:restaurants(*)')
      .eq('auth_id', authUser.id)
      .single()

    if (userProfile) {
      setCurrentUser(userProfile as User)
      setRestaurant((userProfile as unknown as { restaurant: Restaurant }).restaurant)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <RestaurantContext.Provider value={{ restaurant, currentUser, loading, refetch: load }}>
      {children}
    </RestaurantContext.Provider>
  )
}

export function useRestaurant() {
  return useContext(RestaurantContext)
}

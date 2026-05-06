'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { DishflowLogo } from '@/components/shared/dishflow-logo'
import { slugify } from '@/lib/utils'

const COUNTRIES = [
  { value: 'UAE', label: 'United Arab Emirates', currency: 'AED' },
  { value: 'SAU', label: 'Saudi Arabia', currency: 'SAR' },
  { value: 'QAT', label: 'Qatar', currency: 'QAR' },
  { value: 'OMN', label: 'Oman', currency: 'OMR' },
]

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Account details
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Restaurant details
  const [restaurantName, setRestaurantName] = useState('')
  const [country, setCountry] = useState('UAE')
  const [phone, setPhone] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create account')

      const currency = COUNTRIES.find(c => c.value === country)?.currency ?? 'AED'

      // 2. Create restaurant (use service role via RPC to bypass RLS)
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: restaurantName,
          slug: slugify(restaurantName) + '-' + Date.now().toString().slice(-4),
          country,
          currency,
          phone,
          timezone: 'Asia/Dubai',
          vat_rate: 5,
        })
        .select()
        .single()

      if (restaurantError) throw new Error('Restaurant creation failed: ' + restaurantError.message)
      if (!restaurant) throw new Error('Restaurant not returned after insert')

      // 3. Create owner user profile
      const { error: userError } = await supabase
        .from('users')
        .insert({
          restaurant_id: restaurant.id,
          auth_id: authData.user.id,
          email,
          full_name: fullName,
          role: 'owner',
          is_active: true,
        })

      if (userError) throw new Error('User profile creation failed: ' + userError.message)

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-3">
        <DishflowLogo size={56} />
        <div className="text-center">
          <h1 className="text-2xl font-bold">Dishflow</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Create your free account</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
        <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">
            {step === 1 ? 'Your account' : 'Your restaurant'}
          </CardTitle>
          <CardDescription>
            {step === 1 ? 'Create your login credentials' : 'Tell us about your restaurant'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={e => { e.preventDefault(); setStep(2) }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  placeholder="Ahmed Al-Rashidi"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ahmed@restaurant.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Continue →</Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantName">Restaurant name</Label>
                <Input
                  id="restaurantName"
                  placeholder="Burger House Dubai"
                  value={restaurantName}
                  onChange={e => setRestaurantName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+971 50 123 4567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  ← Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : 'Create Account'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{' '}
        <a href="/login" className="text-[var(--primary)] font-medium hover:underline">
          Sign in
        </a>
      </p>
    </div>
  )
}

'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, UtensilsCrossed, MapPin, Settings2, Rocket } from 'lucide-react'
import { DishflowLogo } from '@/components/shared/dishflow-logo'
import { slugify } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'Your Restaurant', icon: UtensilsCrossed },
  { id: 2, label: 'Location', icon: MapPin },
  { id: 3, label: 'Preferences', icon: Settings2 },
]

const COUNTRIES = [
  { value: 'UAE', label: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai' },
  { value: 'SAU', label: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { value: 'QAT', label: 'Qatar', currency: 'QAR', timezone: 'Asia/Qatar' },
  { value: 'KWT', label: 'Kuwait', currency: 'KWD', timezone: 'Asia/Kuwait' },
  { value: 'BHR', label: 'Bahrain', currency: 'BHD', timezone: 'Asia/Bahrain' },
  { value: 'OMN', label: 'Oman', currency: 'OMR', timezone: 'Asia/Muscat' },
]

const RESTAURANT_TYPES = [
  'Fine Dining', 'Casual Dining', 'Fast Food', 'Café', 'Bakery',
  'Food Truck', 'Cloud Kitchen', 'Buffet', 'Pizzeria', 'Steakhouse',
]

export default function SetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [restaurantName, setRestaurantName] = useState('')
  const [restaurantType, setRestaurantType] = useState('')

  // Step 2
  const [country, setCountry] = useState('UAE')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Step 3
  const [vatRate, setVatRate] = useState('5')

  async function handleLaunch() {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const selectedCountry = COUNTRIES.find(c => c.value === country)
      const currency = selectedCountry?.currency ?? 'AED'
      const timezone = selectedCountry?.timezone ?? 'Asia/Dubai'

      // Create restaurant
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: restaurantName,
          slug: slugify(restaurantName) + '-' + Date.now().toString().slice(-4),
          country,
          currency,
          timezone,
          city,
          address,
          phone,
          email,
          vat_rate: parseFloat(vatRate),
          is_active: true,
        })
        .select()
        .single()

      if (restaurantError) throw new Error(restaurantError.message)

      // Check if user profile exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (!existingUser) {
        const { error: userError } = await supabase
          .from('users')
          .insert({
            restaurant_id: restaurant.id,
            auth_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name ?? '',
            role: 'owner',
            is_active: true,
          })
        if (userError) throw new Error(userError.message)
      } else {
        await supabase
          .from('users')
          .update({ restaurant_id: restaurant.id })
          .eq('auth_id', user.id)
      }

      setLaunching(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (launching) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white gap-6">
        <DishflowLogo size={64} />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Launching {restaurantName}...</h2>
          <p className="text-[var(--muted-foreground)]">Setting up your restaurant dashboard</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">

        {/* Header */}
        <div className="flex flex-col items-center space-y-3">
          <DishflowLogo size={48} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Set up your restaurant</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Takes less than 2 minutes</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isComplete = step > s.id
            const isActive = step === s.id
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                    isComplete ? 'bg-[var(--primary)] border-[var(--primary)] text-white' :
                    isActive ? 'border-[var(--primary)] text-[var(--primary)]' :
                    'border-[var(--border)] text-[var(--muted-foreground)]'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-16 mb-5 mx-2 ${step > s.id ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm space-y-5">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="restaurantName">Restaurant name *</Label>
                <Input
                  id="restaurantName"
                  placeholder="e.g. Burger House Dubai"
                  value={restaurantName}
                  onChange={e => setRestaurantName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Restaurant type</Label>
                <Select value={restaurantType} onValueChange={setRestaurantType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RESTAURANT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Country *</Label>
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
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="e.g. Dubai"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="e.g. Sheikh Zayed Road, DIFC"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+971 50 123 4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remail">Email</Label>
                  <Input
                    id="remail"
                    type="email"
                    placeholder="info@restaurant.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 space-y-1">
                <p className="text-sm font-medium text-[var(--foreground)]">Almost there!</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Just a few preferences and your restaurant will be live.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input
                  value={COUNTRIES.find(c => c.value === country)?.currency ?? 'AED'}
                  disabled
                  className="bg-[var(--accent)]"
                />
                <p className="text-xs text-[var(--muted-foreground)]">Based on your selected country</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vat">VAT Rate (%)</Label>
                <Input
                  id="vat"
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={vatRate}
                  onChange={e => setVatRate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
                ← Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  if (step === 1 && !restaurantName.trim()) {
                    setError('Please enter your restaurant name')
                    return
                  }
                  setError('')
                  setStep(s => s + 1)
                }}
              >
                Continue →
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1 gap-2"
                onClick={handleLaunch}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Launching...</>
                ) : (
                  <><Rocket className="h-4 w-4" /> Launch My Restaurant</>
                )}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[var(--muted-foreground)]">
          You can update all these details later in Settings
        </p>
      </div>
    </div>
  )
}

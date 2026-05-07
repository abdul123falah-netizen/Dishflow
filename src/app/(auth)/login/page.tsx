'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react'
import { DishflowLogo } from '@/components/shared/dishflow-logo'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.replace('/dashboard')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) window.location.replace('/dashboard')
    })
    return () => subscription.unsubscribe()
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function handleDemoLogin() {
    setDemoLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'demo@dishflow.app',
        password: 'Demo1234!',
      })

      if (error) throw error

      // Force hard redirect — most reliable way to flush auth state
      window.location.replace('/dashboard')
    } catch {
      setError('Demo login failed. Please try again.')
      setDemoLoading(false)
    }
  }

  if (demoLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white gap-6">
        <DishflowLogo size={64} />
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Loading Ember & Oak...</h2>
          <p className="text-[var(--muted-foreground)]">Preparing your demo experience</p>
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="flex flex-col items-center space-y-3">
        <DishflowLogo size={56} />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Dishflow</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Sign in to your account</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Welcome back</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@myrestaurant.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--border)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[var(--card)] px-2 text-[var(--muted-foreground)]">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleDemoLogin}
            disabled={demoLoading}
          >
            <Sparkles className="h-4 w-4 text-orange-400" />
            Try Demo — Ember & Oak
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-[var(--muted-foreground)]">
        Don&apos;t have an account?{' '}
        <a href="/register" className="text-[var(--primary)] font-medium hover:underline">
          Create one free
        </a>
      </p>
    </div>
  )
}

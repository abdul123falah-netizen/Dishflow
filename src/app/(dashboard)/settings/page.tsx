'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/shared/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Check, Loader2, Copy, ExternalLink, Bike, Lock } from 'lucide-react'
import { useRestaurant } from '@/lib/context/restaurant-context'
import { createClient } from '@/lib/supabase/client'
import { useTables, useAddTable, useRemoveTable, useStaff, useUpdateStaff, useCreateStaff, useUpdateRestaurant } from '@/lib/hooks/use-settings'
import { useIntegrations, useSaveIntegration } from '@/lib/hooks/use-integrations'
import type { User } from '@/types'

const DELIVERY_PLATFORMS = [
  { id: 'deliverect', name: 'Deliverect', description: 'Aggregator for Talabat, Careem, Noon, Deliveroo, Keeta & more', color: 'bg-violet-600', docs: 'https://www.deliverect.com' },
] as const

const CURRENCIES = ['AED', 'SAR', 'QAR', 'OMR']
const COUNTRIES = ['UAE', 'Saudi Arabia', 'Qatar', 'Oman']
const ROLES = ['owner', 'manager', 'cashier', 'kitchen'] as const

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'restaurant' | 'tables' | 'staff' | 'integrations' | 'security'>('restaurant')
  const [saved, setSaved] = useState(false)

  const { restaurant, refetch } = useRestaurant()
  const updateRestaurant = useUpdateRestaurant()

  // Restaurant form state — seeded from context once loaded
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [vatNumber, setVatNumber] = useState('')
  const [currency, setCurrency] = useState('AED')
  const [country, setCountry] = useState('UAE')

  useEffect(() => {
    if (!restaurant) return
    setName(restaurant.name ?? '')
    setPhone(restaurant.phone ?? '')
    setEmail(restaurant.email ?? '')
    setAddress(restaurant.address ?? '')
    setVatNumber(restaurant.vat_number ?? '')
    setCurrency(restaurant.currency ?? 'AED')
    setCountry(restaurant.country ?? 'UAE')
  }, [restaurant])

  async function handleSaveRestaurant() {
    if (!restaurant) return
    await updateRestaurant.mutateAsync({
      id: restaurant.id,
      updates: { name, phone, email, address, vat_number: vatNumber, currency, country },
    })
    refetch()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Tables
  const { data: tables = [], isLoading: tablesLoading } = useTables()
  const addTable = useAddTable()
  const removeTable = useRemoveTable()
  const [newTableNum, setNewTableNum] = useState('')

  async function handleAddTable() {
    if (!newTableNum.trim()) return
    await addTable.mutateAsync({ table_number: newTableNum.trim(), capacity: 4 })
    setNewTableNum('')
  }

  // Integrations
  const { data: integrations = [] } = useIntegrations()
  const saveIntegration = useSaveIntegration()
  const [intSecrets, setIntSecrets] = useState<Record<string, string>>({})
  const [intEnabled, setIntEnabled] = useState<Record<string, boolean>>({})
  const [intSaved, setIntSaved] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (integrations.length === 0) return
    const secrets: Record<string, string> = {}
    const enabled: Record<string, boolean> = {}
    integrations.forEach(i => {
      secrets[i.provider] = i.webhook_secret ?? ''
      enabled[i.provider] = i.is_enabled
    })
    setIntSecrets(prev => ({ ...prev, ...secrets }))
    setIntEnabled(prev => ({ ...prev, ...enabled }))
  }, [integrations])

  async function handleSaveIntegration(provider: string) {
    await saveIntegration.mutateAsync({
      provider,
      webhook_secret: intSecrets[provider] ?? '',
      is_enabled: intEnabled[provider] ?? true,
    })
    setIntSaved(prev => ({ ...prev, [provider]: true }))
    setTimeout(() => setIntSaved(prev => ({ ...prev, [provider]: false })), 2000)
  }

  function copyWebhookUrl(provider: string) {
    if (!restaurant) return
    const url = `${window.location.origin}/api/delivery/webhook?rid=${restaurant.id}`
    navigator.clipboard.writeText(url)
  }

  // Staff
  const { data: staff = [], isLoading: staffLoading } = useStaff()
  const updateStaff = useUpdateStaff()
  const createStaff = useCreateStaff()

  const [showAddStaff, setShowAddStaff] = useState(false)
  const [staffForm, setStaffForm] = useState({ full_name: '', email: '', role: 'cashier' as typeof ROLES[number] })

  async function handleCreateStaff() {
    if (!staffForm.full_name) return
    await createStaff.mutateAsync({
      full_name: staffForm.full_name,
      email: staffForm.email || undefined,
      role: staffForm.role,
      is_active: true,
    })
    setShowAddStaff(false)
    setStaffForm({ full_name: '', email: '', role: 'cashier' })
  }

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  async function handleChangePassword() {
    if (newPassword.length < 6) { setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters' }); return }
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: 'error', text: 'Passwords do not match' }); return }
    setPasswordLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)
    if (error) { setPasswordMsg({ type: 'error', text: error.message }); return }
    setPasswordMsg({ type: 'success', text: 'Password updated successfully!' })
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordMsg(null), 3000)
  }

  const TABS = [
    { key: 'restaurant' as const, label: 'Restaurant' },
    { key: 'tables' as const, label: 'Tables' },
    { key: 'staff' as const, label: 'Staff' },
    { key: 'integrations' as const, label: 'Integrations' },
    { key: 'security' as const, label: 'Security' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Settings" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'restaurant' && (
            <Card>
              <CardHeader>
                <CardTitle>Restaurant Profile</CardTitle>
                <CardDescription>Your restaurant's public information and billing details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!restaurant ? (
                  <div className="flex items-center justify-center h-32 gap-2 text-[var(--muted-foreground)]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <Label>Restaurant Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label>Address</Label>
                        <Input value={address} onChange={e => setAddress(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Country</Label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Currency</Label>
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label>VAT Number</Label>
                        <Input value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="e.g. 100123456700003" />
                      </div>
                    </div>
                    <Separator />
                    <Button
                      onClick={handleSaveRestaurant}
                      className="w-full"
                      variant={saved ? 'success' : 'default'}
                      disabled={updateRestaurant.isPending}
                    >
                      {updateRestaurant.isPending
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving...</>
                        : saved
                          ? <><Check className="h-4 w-4 mr-1" />Saved!</>
                          : 'Save Changes'
                      }
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'tables' && (
            <Card>
              <CardHeader>
                <CardTitle>Table Management</CardTitle>
                <CardDescription>Configure your restaurant's dine-in tables</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Table number (e.g. T6 or Terrace2)"
                    value={newTableNum}
                    onChange={e => setNewTableNum(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTable()}
                  />
                  <Button onClick={handleAddTable} disabled={addTable.isPending || !newTableNum.trim()}>
                    {addTable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
                {tablesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading tables...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tables.map(table => (
                      <div
                        key={table.id}
                        className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2"
                      >
                        <span className="text-sm font-medium">{table.table_number}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">cap. {table.capacity}</span>
                        <button
                          onClick={() => removeTable.mutate(table.id)}
                          disabled={removeTable.isPending}
                          className="text-[var(--muted-foreground)] hover:text-red-500 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    {tables.length === 0 && (
                      <p className="text-sm text-[var(--muted-foreground)]">No tables configured yet</p>
                    )}
                  </div>
                )}
                <p className="text-xs text-[var(--muted-foreground)]">{tables.length} tables configured</p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery App Integrations</CardTitle>
                  <CardDescription>
                    Connect your delivery platforms via Deliverect. Orders will appear automatically in the Kitchen Display.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!restaurant ? (
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : DELIVERY_PLATFORMS.map(platform => {
                    const saved = intSaved[platform.id]
                    const enabled = intEnabled[platform.id] ?? true
                    const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/delivery/webhook?rid=${restaurant.id}`

                    return (
                      <div key={platform.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${platform.color}`}>
                              <Bike className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{platform.name}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{platform.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <a
                              href={platform.docs}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                            >
                              Sign up <ExternalLink className="h-3 w-3" />
                            </a>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={e => setIntEnabled(prev => ({ ...prev, [platform.id]: e.target.checked }))}
                                className="h-4 w-4 accent-[var(--primary)]"
                              />
                              <span className="text-xs text-[var(--muted-foreground)]">Enabled</span>
                            </label>
                          </div>
                        </div>

                        {/* Webhook URL */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Webhook URL — paste this into Deliverect</Label>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={webhookUrl}
                              className="font-mono text-xs bg-slate-50"
                            />
                            <Button variant="outline" size="icon" onClick={() => copyWebhookUrl(platform.id)} title="Copy URL">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Webhook secret */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Webhook Secret — from Deliverect dashboard</Label>
                          <Input
                            type="password"
                            placeholder="Paste your Deliverect webhook secret"
                            value={intSecrets[platform.id] ?? ''}
                            onChange={e => setIntSecrets(prev => ({ ...prev, [platform.id]: e.target.value }))}
                          />
                        </div>

                        <Button
                          onClick={() => handleSaveIntegration(platform.id)}
                          disabled={saveIntegration.isPending}
                          variant={saved ? 'success' : 'default'}
                          size="sm"
                        >
                          {saveIntegration.isPending
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />Saving...</>
                            : saved
                              ? <><Check className="h-3.5 w-3.5 mr-1" />Saved!</>
                              : 'Save Integration'
                          }
                        </Button>

                        <Separator />

                        <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-3 space-y-1.5">
                          <p className="text-xs font-semibold text-[var(--foreground)]">How to set up</p>
                          <ol className="list-decimal list-inside space-y-1 text-xs text-[var(--muted-foreground)]">
                            <li>Create a Deliverect account and link your Talabat, Careem, Keeta, etc. channels</li>
                            <li>In Deliverect → Settings → Integrations → POS, choose <strong>Custom Webhook</strong></li>
                            <li>Paste the Webhook URL above into Deliverect</li>
                            <li>Copy the generated secret from Deliverect and paste it into the Webhook Secret field above</li>
                            <li>Save — new orders from all linked platforms will appear in your Kitchen Display automatically</li>
                          </ol>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'staff' && (
            <Card>
              <CardHeader>
                <CardTitle>Staff & Access</CardTitle>
                <CardDescription>Manage your team members and their roles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {staffLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading staff...
                  </div>
                ) : (
                  staff.map((member: User) => (
                    <div key={member.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold">
                          {member.full_name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.full_name}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{member.email || 'PIN only'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize text-xs">{member.role}</Badge>
                        <Badge variant={member.is_active ? 'success' : 'destructive'} className="text-xs">
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          disabled={updateStaff.isPending}
                          onClick={() => updateStaff.mutate({ id: member.id, updates: { is_active: !member.is_active } })}
                        >
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <Button variant="outline" className="w-full" size="sm" onClick={() => setShowAddStaff(true)}>
                  <Plus className="h-4 w-4 mr-1" />Add Staff Member
                </Button>
              </CardContent>
            </Card>
          )}
          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="h-4 w-4" />Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordMsg && (
                  <div className={`rounded-md px-4 py-3 text-sm ${passwordMsg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {passwordMsg.text}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>New Password</Label>
                  <Input type="password" placeholder="Min. 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Password</Label>
                  <Input type="password" placeholder="Repeat new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <Button onClick={handleChangePassword} disabled={passwordLoading || !newPassword || !confirmPassword} className="w-full">
                  {passwordLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Updating...</> : 'Update Password'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="Ahmed Hassan"
                value={staffForm.full_name}
                onChange={e => setStaffForm(f => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email (optional)</Label>
              <Input
                type="email"
                placeholder="ahmed@restaurant.com"
                value={staffForm.email}
                onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={staffForm.role} onValueChange={v => setStaffForm(f => ({ ...f, role: v as typeof ROLES[number] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStaff(false)}>Cancel</Button>
            <Button
              onClick={handleCreateStaff}
              disabled={!staffForm.full_name || createStaff.isPending}
            >
              {createStaff.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Add Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

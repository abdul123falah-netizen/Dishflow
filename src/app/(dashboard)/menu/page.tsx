'use client'

import { useState } from 'react'
import { Header } from '@/components/shared/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, FolderPlus, ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import {
  useMenuCategories, useAllMenuItems,
  useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, useToggleItemAvailability,
  useCreateCategory, useDeleteCategory
} from '@/lib/hooks/use-menu'
import type { MenuCategory, MenuItem } from '@/types'

interface ItemFormState {
  name: string; name_ar: string; category_id: string
  base_price: string; description: string; is_available: boolean; is_featured: boolean
  image_url: string
}
const EMPTY_FORM: ItemFormState = {
  name: '', name_ar: '', category_id: '', base_price: '',
  description: '', is_available: true, is_featured: false, image_url: '',
}

export default function MenuPage() {
  const { data: categories = [] } = useMenuCategories()
  const { data: allItems = [], isLoading } = useAllMenuItems()
  const [activeCategory, setActiveCategory] = useState<string>('')

  if (categories.length > 0 && !activeCategory) setActiveCategory(categories[0].id)

  const createItem = useCreateMenuItem()
  const updateItem = useUpdateMenuItem()
  const deleteItem = useDeleteMenuItem()
  const toggleAvailability = useToggleItemAvailability()

  const createCategory = useCreateCategory()
  const deleteCategory = useDeleteCategory()
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [categoryNameAr, setCategoryNameAr] = useState('')

  const [showItemDialog, setShowItemDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [form, setForm] = useState<ItemFormState>(EMPTY_FORM)
  const [imageUploading, setImageUploading] = useState(false)

  async function handleImageUpload(file: File) {
    setImageUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: publicUrl }))
    } finally {
      setImageUploading(false)
    }
  }

  async function saveCategory() {
    if (!categoryName.trim()) return
    await createCategory.mutateAsync({ name: categoryName.trim(), name_ar: categoryNameAr.trim() })
    setCategoryName('')
    setCategoryNameAr('')
    setShowCategoryDialog(false)
  }

  async function handleDeleteCategory(id: string) {
    if (confirm('Delete this category and all its items?')) {
      await deleteCategory.mutateAsync(id)
      setActiveCategory('')
    }
  }

  const displayedItems = allItems.filter(i => i.category_id === activeCategory)

  function openAdd() {
    setEditingItem(null)
    setForm({ ...EMPTY_FORM, category_id: activeCategory })
    setShowItemDialog(true)
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item)
    setForm({
      name: item.name, name_ar: item.name_ar ?? '', category_id: item.category_id,
      base_price: item.base_price.toString(), description: item.description ?? '',
      is_available: item.is_available, is_featured: item.is_featured,
      image_url: item.image_url ?? '',
    })
    setShowItemDialog(true)
  }

  async function saveItem() {
    if (!form.name || !form.base_price || !form.category_id) return
    const payload = {
      name: form.name, name_ar: form.name_ar, category_id: form.category_id,
      base_price: parseFloat(form.base_price), description: form.description,
      is_available: form.is_available, is_featured: form.is_featured,
      image_url: form.image_url || undefined,
    }
    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, updates: payload })
    } else {
      await createItem.mutateAsync(payload)
    }
    setShowItemDialog(false)
  }

  async function handleToggle(item: MenuItem) {
    await toggleAvailability.mutateAsync({ id: item.id, is_available: !item.is_available })
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this item? This cannot be undone.')) {
      await deleteItem.mutateAsync(id)
    }
  }

  const isSaving = createItem.isPending || updateItem.isPending

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Menu Management"
        action={<Button onClick={openAdd} size="sm"><Plus className="h-4 w-4 mr-1" />Add Item</Button>}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Category sidebar */}
        <div className="w-48 shrink-0 border-r border-[var(--border)] bg-white flex flex-col">
          <div className="p-3 border-b border-[var(--border)]">
            <button
              onClick={() => setShowCategoryDialog(true)}
              className="w-full flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--primary)] border border-dashed border-[var(--primary)] hover:bg-orange-50 transition-colors"
            >
              <FolderPlus className="h-4 w-4" /> Add Category
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {categories.length === 0 ? (
              <p className="text-xs text-center text-[var(--muted-foreground)] py-4">No categories yet</p>
            ) : categories.map((cat: MenuCategory) => {
              const count = allItems.filter(i => i.category_id === cat.id).length
              return (
                <div key={cat.id} className="group relative">
                  <button
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors pr-8 ${
                      activeCategory === cat.id
                        ? 'bg-orange-50 text-[var(--primary)] font-medium'
                        : 'text-[var(--muted-foreground)] hover:bg-slate-50'
                    }`}
                  >
                    <span className="block">{cat.name}</span>
                    <span className="text-xs opacity-60">{count} items</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-500 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-[var(--muted-foreground)]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading menu...
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-[var(--muted-foreground)]">
              <p className="text-sm">No items in this category</p>
              <Button onClick={openAdd} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />Add First Item
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-white p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl overflow-hidden">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      : '🍽️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.name}</p>
                      {item.is_featured && <Badge variant="info" className="text-xs">Featured</Badge>}
                    </div>
                    {item.name_ar && <p className="text-xs text-[var(--muted-foreground)]">{item.name_ar}</p>}
                    {item.description && <p className="text-xs text-[var(--muted-foreground)] truncate">{item.description}</p>}
                  </div>
                  <p className="font-bold text-[var(--primary)] shrink-0">{formatCurrency(item.base_price, 'AED')}</p>
                  <Badge variant={item.is_available ? 'success' : 'destructive'} className="shrink-0">
                    {item.is_available ? 'Available' : 'Out'}
                  </Badge>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => handleToggle(item)} title="Toggle availability">
                      {item.is_available
                        ? <ToggleRight className="h-4 w-4 text-green-500" />
                        : <ToggleLeft className="h-4 w-4 text-[var(--muted-foreground)]" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name (English) *</Label>
              <Input placeholder="e.g. Burgers" value={categoryName} onChange={e => setCategoryName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Name (Arabic)</Label>
              <Input placeholder="برجر" value={categoryNameAr} onChange={e => setCategoryNameAr(e.target.value)} dir="rtl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={saveCategory} disabled={!categoryName.trim() || createCategory.isPending}>
              {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name (English) *</Label>
                <Input placeholder="Chicken Burger" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Name (Arabic)</Label>
                <Input placeholder="برجر الدجاج" value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} dir="rtl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c: MenuCategory) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Price (AED) *</Label>
                <Input type="number" placeholder="35.00" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))} min="0" step="0.5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Short description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Photo</Label>
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  <img src={form.image_url} alt="preview" className="h-16 w-16 rounded-lg object-cover border border-[var(--border)]" />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center text-2xl border border-dashed border-[var(--border)]">🍽️</div>
                )}
                <label className="flex-1 cursor-pointer">
                  <div className={`flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-4 py-3 text-sm text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors ${imageUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {imageUploading ? 'Uploading...' : form.image_url ? 'Change photo' : 'Upload photo'}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                </label>
                {form.image_url && (
                  <button onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="text-[var(--muted-foreground)] hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm">Available</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="text-sm">Featured</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
            <Button onClick={saveItem} disabled={!form.name || !form.base_price || !form.category_id || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

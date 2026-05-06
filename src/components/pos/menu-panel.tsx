'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import type { MenuItem, ItemVariant, ItemModifier, CartItem } from '@/types'

interface Category { id: string; name: string; name_ar?: string }

interface MenuPanelProps {
  categories: Category[]
  items: MenuItem[]
  activeCategoryId: string
  onCategoryChange: (id: string) => void
  onAddItem: (item: MenuItem) => void
  onAddItemWithOptions: (cartItem: CartItem) => void
}

export function MenuPanel({
  categories, items, activeCategoryId,
  onCategoryChange, onAddItem, onAddItemWithOptions
}: MenuPanelProps) {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | null>(null)
  const [selectedModifiers, setSelectedModifiers] = useState<ItemModifier[]>([])
  const [itemNote, setItemNote] = useState('')

  function handleItemTap(item: MenuItem) {
    if (!item.is_available) return
    if (item.variants?.length || item.modifiers?.length) {
      setSelectedItem(item)
      setSelectedVariant(item.variants?.find(v => v.is_default) ?? item.variants?.[0] ?? null)
      setSelectedModifiers([])
      setItemNote('')
    } else {
      onAddItem(item)
    }
  }

  function toggleModifier(mod: ItemModifier) {
    setSelectedModifiers(prev =>
      prev.find(m => m.id === mod.id)
        ? prev.filter(m => m.id !== mod.id)
        : [...prev, mod]
    )
  }

  function handleAddWithOptions() {
    if (!selectedItem) return
    const variantPrice = selectedVariant?.price_modifier ?? 0
    const modifiersTotal = selectedModifiers.reduce((sum, m) => sum + m.price, 0)
    const unitPrice = selectedItem.base_price + variantPrice + modifiersTotal

    onAddItemWithOptions({
      menu_item_id: selectedItem.id,
      item_name: selectedItem.name,
      item_name_ar: selectedItem.name_ar,
      unit_price: unitPrice,
      quantity: 1,
      notes: itemNote,
      selected_variant: selectedVariant ?? undefined,
      selected_modifiers: selectedModifiers,
      line_total: unitPrice,
    })
    setSelectedItem(null)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto bg-white border-b border-[var(--border)] px-4 py-2 scrollbar-thin">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              activeCategoryId === cat.id
                ? 'bg-[var(--primary)] text-white'
                : 'bg-slate-100 text-[var(--muted-foreground)] hover:bg-slate-200'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Menu items grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => handleItemTap(item)}
              disabled={!item.is_available}
              className={cn(
                'relative flex flex-col rounded-xl border bg-white p-3 text-left transition-all touch-target',
                item.is_available
                  ? 'border-[var(--border)] hover:border-[var(--primary)] hover:shadow-md active:scale-95'
                  : 'border-[var(--border)] opacity-50 cursor-not-allowed'
              )}
            >
              {/* Item image */}
              <div className="mb-2 h-16 w-full overflow-hidden rounded-lg bg-slate-100">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center text-2xl">🍽️</div>
                }
              </div>
              <p className="text-sm font-medium leading-tight">{item.name}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{item.name_ar}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--primary)]">
                  {formatCurrency(item.base_price, 'AED')}
                </span>
                {item.is_available
                  ? <Plus className="h-4 w-4 text-[var(--primary)]" />
                  : <span className="text-xs text-red-500 font-medium">Out</span>
                }
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Item options bottom sheet */}
      {selectedItem && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/40" onClick={() => setSelectedItem(null)}>
          <div
            className="w-full max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedItem.name}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{formatCurrency(selectedItem.base_price, 'AED')}</p>
              </div>
              <button onClick={() => setSelectedItem(null)}>
                <X className="h-5 w-5 text-[var(--muted-foreground)]" />
              </button>
            </div>

            {/* Variants */}
            {selectedItem.variants && selectedItem.variants.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Size</p>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.variants.map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                        selectedVariant?.id === variant.id
                          ? 'border-[var(--primary)] bg-orange-50 text-[var(--primary)]'
                          : 'border-[var(--border)] hover:border-[var(--primary)]'
                      )}
                    >
                      {variant.name}
                      {variant.price_modifier !== 0 && (
                        <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                          +{formatCurrency(variant.price_modifier, 'AED')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modifiers */}
            {selectedItem.modifiers && selectedItem.modifiers.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Add-ons</p>
                <div className="space-y-2">
                  {selectedItem.modifiers.map(mod => (
                    <label
                      key={mod.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 cursor-pointer hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedModifiers.some(m => m.id === mod.id)}
                          onChange={() => toggleModifier(mod)}
                          className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                        />
                        <span className="text-sm">{mod.name}</span>
                      </div>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {mod.price > 0 ? `+${formatCurrency(mod.price, 'AED')}` : 'Free'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="mb-4">
              <p className="text-sm font-semibold mb-2">Note (optional)</p>
              <input
                type="text"
                placeholder="e.g. No onions, extra spicy..."
                value={itemNote}
                onChange={e => setItemNote(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <Button onClick={handleAddWithOptions} className="w-full" size="lg">
              Add to Order
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export type UserRole = 'owner' | 'manager' | 'cashier' | 'kitchen'
export type OrderType = 'dine_in' | 'takeaway' | 'delivery'
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'online' | 'wallet' | 'credit'
export type CustomerTag = 'regular' | 'vip' | 'blacklisted'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired'

export interface Restaurant {
  id: string
  name: string
  name_ar?: string
  slug: string
  logo_url?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  country: string
  currency: string
  vat_number?: string
  vat_rate: number
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  restaurant_id: string
  email?: string
  phone?: string
  full_name: string
  full_name_ar?: string
  role: UserRole
  pin?: string
  avatar_url?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface RestaurantTable {
  id: string
  restaurant_id: string
  table_number: string
  capacity: number
  is_active: boolean
  created_at: string
}

export interface MenuCategory {
  id: string
  restaurant_id: string
  name: string
  name_ar?: string
  description?: string
  image_url?: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  items?: MenuItem[]
}

export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string
  name: string
  name_ar?: string
  description?: string
  description_ar?: string
  base_price: number
  image_url?: string
  sku?: string
  is_available: boolean
  is_featured: boolean
  prep_time_mins: number
  sort_order: number
  created_at: string
  updated_at: string
  category?: MenuCategory
  variants?: ItemVariant[]
  modifiers?: ItemModifier[]
}

export interface ItemVariant {
  id: string
  item_id: string
  restaurant_id: string
  name: string
  name_ar?: string
  price_modifier: number
  is_default: boolean
  is_active: boolean
  sort_order: number
}

export interface ItemModifier {
  id: string
  item_id: string
  restaurant_id: string
  name: string
  name_ar?: string
  price: number
  is_active: boolean
  sort_order: number
}

export interface Customer {
  id: string
  restaurant_id: string
  full_name?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  tag: CustomerTag
  total_orders: number
  total_spent: number
  last_order_at?: string
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  restaurant_id: string
  order_number: string
  order_type: OrderType
  status: OrderStatus
  payment_status: PaymentStatus
  table_id?: string
  customer_id?: string
  served_by?: string
  subtotal: number
  discount_type?: string
  discount_value: number
  discount_amount: number
  vat_rate: number
  vat_amount: number
  total_amount: number
  delivery_address?: string
  delivery_notes?: string
  notes?: string
  cancelled_reason?: string
  cancelled_by?: string
  completed_at?: string
  created_at: string
  updated_at: string
  table?: RestaurantTable
  customer?: Customer
  served_by_user?: User
  items?: OrderItem[]
  transactions?: Transaction[]
}

export interface OrderItem {
  id: string
  order_id: string
  restaurant_id: string
  menu_item_id?: string
  item_name: string
  item_name_ar?: string
  unit_price: number
  quantity: number
  notes?: string
  line_total: number
  created_at: string
  variants?: OrderItemVariant[]
  modifiers?: OrderItemModifier[]
}

export interface OrderItemVariant {
  id: string
  order_item_id: string
  variant_name: string
  price_modifier: number
}

export interface OrderItemModifier {
  id: string
  order_item_id: string
  modifier_name: string
  price: number
}

export interface Transaction {
  id: string
  restaurant_id: string
  order_id: string
  payment_method: PaymentMethod
  amount: number
  reference_number?: string
  processed_by?: string
  notes?: string
  created_at: string
}

// POS-specific cart types
export interface CartItem {
  menu_item_id: string
  item_name: string
  item_name_ar?: string
  unit_price: number
  quantity: number
  notes?: string
  selected_variant?: ItemVariant
  selected_modifiers: ItemModifier[]
  line_total: number
}

export interface DashboardStats {
  total_revenue: number
  total_orders: number
  avg_order_value: number
  vat_collected: number
  revenue_change: number
  orders_change: number
  aov_change: number
}

export interface TopItem {
  menu_item_id: string
  item_name: string
  total_quantity: number
  total_revenue: number
}

export interface HourlySales {
  hour: number
  revenue: number
  orders: number
}

-- ============================================================
-- RestaurantOS — Initial Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'cashier', 'kitchen');
CREATE TYPE order_type AS ENUM ('dine_in', 'takeaway', 'delivery');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('unpaid', 'partial', 'paid', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'online', 'wallet', 'credit');
CREATE TYPE customer_tag AS ENUM ('regular', 'vip', 'blacklisted');
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');

-- ============================================================
-- RESTAURANTS
-- ============================================================
CREATE TABLE restaurants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  name_ar         TEXT,
  slug            TEXT UNIQUE NOT NULL,
  logo_url        TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  city            TEXT,
  country         TEXT NOT NULL DEFAULT 'UAE',
  currency        TEXT NOT NULL DEFAULT 'AED',
  vat_number      TEXT,
  vat_rate        DECIMAL(5,2) DEFAULT 5.00,
  timezone        TEXT NOT NULL DEFAULT 'Asia/Dubai',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  auth_id         UUID UNIQUE,                   -- links to Supabase auth.users
  email           TEXT,
  phone           TEXT,
  full_name       TEXT NOT NULL,
  full_name_ar    TEXT,
  role            user_role NOT NULL DEFAULT 'cashier',
  pin             TEXT,
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESTAURANT TABLES
-- ============================================================
CREATE TABLE restaurant_tables (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number    TEXT NOT NULL,
  capacity        INT DEFAULT 4,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, table_number)
);

-- ============================================================
-- MENU CATEGORIES
-- ============================================================
CREATE TABLE menu_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  image_url       TEXT,
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MENU ITEMS
-- ============================================================
CREATE TABLE menu_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  description     TEXT,
  description_ar  TEXT,
  base_price      DECIMAL(10,2) NOT NULL,
  image_url       TEXT,
  sku             TEXT,
  is_available    BOOLEAN DEFAULT TRUE,
  is_featured     BOOLEAN DEFAULT FALSE,
  prep_time_mins  INT DEFAULT 10,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ITEM VARIANTS
-- ============================================================
CREATE TABLE item_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  price_modifier  DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_default      BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INT DEFAULT 0
);

-- ============================================================
-- ITEM MODIFIERS
-- ============================================================
CREATE TABLE item_modifiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  name_ar         TEXT,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INT DEFAULT 0
);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  full_name       TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  notes           TEXT,
  tag             customer_tag DEFAULT 'regular',
  total_orders    INT DEFAULT 0,
  total_spent     DECIMAL(10,2) DEFAULT 0,
  last_order_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, phone)
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_number        TEXT NOT NULL,
  order_type          order_type NOT NULL,
  status              order_status NOT NULL DEFAULT 'pending',
  payment_status      payment_status NOT NULL DEFAULT 'unpaid',
  table_id            UUID REFERENCES restaurant_tables(id),
  customer_id         UUID REFERENCES customers(id),
  served_by           UUID REFERENCES users(id),
  subtotal            DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_type       TEXT,
  discount_value      DECIMAL(10,2) DEFAULT 0,
  discount_amount     DECIMAL(10,2) DEFAULT 0,
  vat_rate            DECIMAL(5,2) DEFAULT 5.00,
  vat_amount          DECIMAL(10,2) DEFAULT 0,
  total_amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_address    TEXT,
  delivery_notes      TEXT,
  notes               TEXT,
  cancelled_reason    TEXT,
  cancelled_by        UUID REFERENCES users(id),
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, order_number)
);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id        UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  item_name           TEXT NOT NULL,
  item_name_ar        TEXT,
  unit_price          DECIMAL(10,2) NOT NULL,
  quantity            INT NOT NULL DEFAULT 1,
  notes               TEXT,
  line_total          DECIMAL(10,2) NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDER ITEM VARIANTS & MODIFIERS
-- ============================================================
CREATE TABLE order_item_variants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id       UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  variant_name        TEXT NOT NULL,
  price_modifier      DECIMAL(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE order_item_modifiers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id       UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_name       TEXT NOT NULL,
  price               DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id       UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method      payment_method NOT NULL,
  amount              DECIMAL(10,2) NOT NULL,
  reference_number    TEXT,
  processed_by        UUID REFERENCES users(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id   UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       UUID,
  old_value       JSONB,
  new_value       JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_restaurant       ON users(restaurant_id);
CREATE INDEX idx_users_auth_id          ON users(auth_id);
CREATE INDEX idx_orders_restaurant      ON orders(restaurant_id);
CREATE INDEX idx_orders_status          ON orders(restaurant_id, status);
CREATE INDEX idx_orders_created         ON orders(restaurant_id, created_at DESC);
CREATE INDEX idx_orders_customer        ON orders(customer_id);
CREATE INDEX idx_order_items_order      ON order_items(order_id);
CREATE INDEX idx_order_items_restaurant ON order_items(restaurant_id);
CREATE INDEX idx_menu_items_category    ON menu_items(category_id);
CREATE INDEX idx_menu_items_restaurant  ON menu_items(restaurant_id);
CREATE INDEX idx_menu_items_available   ON menu_items(restaurant_id, is_available);
CREATE INDEX idx_customers_phone        ON customers(restaurant_id, phone);
CREATE INDEX idx_transactions_order     ON transactions(order_id);
CREATE INDEX idx_transactions_restaurant ON transactions(restaurant_id, created_at DESC);

-- ============================================================
-- TRIGGERS — auto update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_updated_at   BEFORE UPDATE ON restaurants   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated_at         BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_menu_categories_updated  BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_menu_items_updated       BEFORE UPDATE ON menu_items    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated           BEFORE UPDATE ON orders        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated        BEFORE UPDATE ON customers     FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER — update customer stats on order completion
-- ============================================================
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.customer_id IS NOT NULL
     AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE customers
    SET
      total_orders  = total_orders + 1,
      total_spent   = total_spent + NEW.total_amount,
      last_order_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_customer_stats
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- ============================================================
-- GENERATE ORDER NUMBER per restaurant
-- ============================================================
CREATE OR REPLACE FUNCTION generate_order_number(p_restaurant_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INT)), 0) + 1
  INTO next_num
  FROM orders
  WHERE restaurant_id = p_restaurant_id;
  RETURN 'ORD-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE restaurants        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables  ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_variants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_modifiers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's restaurant_id from users table
CREATE OR REPLACE FUNCTION current_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Restaurants: owner can see their own
CREATE POLICY "users_see_own_restaurant" ON restaurants
  FOR ALL USING (id = current_restaurant_id());

-- All tenant tables: scoped to restaurant
CREATE POLICY "tenant_isolation" ON users
  FOR ALL USING (restaurant_id = current_restaurant_id());

CREATE POLICY "tenant_isolation" ON restaurant_tables
  FOR ALL USING (restaurant_id = current_restaurant_id());

CREATE POLICY "tenant_isolation" ON menu_categories
  FOR ALL USING (restaurant_id = current_restaurant_id());

CREATE POLICY "tenant_isolation" ON menu_items
  FOR ALL USING (restaurant_id = current_restaurant_id());

CREATE POLICY "tenant_isolation" ON item_variants
  FOR ALL USING (restaurant_id = current_restaurant_id());

CREATE POLICY "tenant_isolation" ON item_modifiers
  FOR ALL USING (restaurant_id = current_restaurant_id());

CREATE POLICY "tenant_isolation" ON customers
  FOR ALL USING (restaurant_id = current_restaurant_id());

CREATE POLICY "tenant_isolation" ON orders
  FOR ALL USING (restaurant_id = current_restaurant_id());

CREATE POLICY "tenant_isolation" ON order_items
  FOR ALL USING (restaurant_id = current_restaurant_id());

CREATE POLICY "tenant_isolation" ON order_item_variants
  FOR ALL USING (
    order_item_id IN (
      SELECT id FROM order_items WHERE restaurant_id = current_restaurant_id()
    )
  );

CREATE POLICY "tenant_isolation" ON order_item_modifiers
  FOR ALL USING (
    order_item_id IN (
      SELECT id FROM order_items WHERE restaurant_id = current_restaurant_id()
    )
  );

CREATE POLICY "tenant_isolation" ON transactions
  FOR ALL USING (restaurant_id = current_restaurant_id());

CREATE POLICY "tenant_isolation" ON audit_logs
  FOR ALL USING (restaurant_id = current_restaurant_id());

-- Role-based: only owner/manager can delete menu items
CREATE POLICY "managers_can_delete_menu" ON menu_items
  FOR DELETE USING (
    current_user_role() IN ('owner', 'manager')
  );

CREATE POLICY "managers_can_delete_categories" ON menu_categories
  FOR DELETE USING (
    current_user_role() IN ('owner', 'manager')
  );

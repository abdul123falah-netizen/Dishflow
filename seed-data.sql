-- Ember & Oak Restaurant — Full Seed Data
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  rid uuid;
BEGIN
  SELECT id INTO rid FROM restaurants LIMIT 1;

  -- Update restaurant info
  UPDATE restaurants SET
    name = 'Ember & Oak',
    phone = '+971 4 123 4567',
    address = 'Shop 12, Dubai Marina Walk, Dubai, UAE',
    currency = 'AED',
    country = 'UAE',
    vat_number = '100234567800003'
  WHERE id = rid;

  -- Tables
  INSERT INTO restaurant_tables (restaurant_id, table_number, capacity, is_active) VALUES
    (rid, 'T1', 2, true), (rid, 'T2', 2, true), (rid, 'T3', 4, true),
    (rid, 'T4', 4, true), (rid, 'T5', 4, true), (rid, 'T6', 6, true),
    (rid, 'T7', 6, true), (rid, 'T8', 8, true), (rid, 'T9', 2, true),
    (rid, 'T10', 4, true), (rid, 'Bar 1', 1, true), (rid, 'Bar 2', 1, true),
    (rid, 'Terrace 1', 4, true), (rid, 'Terrace 2', 4, true), (rid, 'VIP', 10, true)
  ON CONFLICT DO NOTHING;

  -- Categories
  INSERT INTO menu_categories (restaurant_id, name, name_ar, sort_order, is_active) VALUES
    (rid, 'Starters', 'المقبلات', 1, true),
    (rid, 'Soups', 'الشوربات', 2, true),
    (rid, 'Salads', 'السلطات', 3, true),
    (rid, 'Burgers', 'البرغر', 4, true),
    (rid, 'Grills', 'المشويات', 5, true),
    (rid, 'Pasta & Risotto', 'المعكرونة', 6, true),
    (rid, 'Seafood', 'المأكولات البحرية', 7, true),
    (rid, 'Sandwiches & Wraps', 'السندويشات', 8, true),
    (rid, 'Sides', 'الأطباق الجانبية', 9, true),
    (rid, 'Desserts', 'الحلويات', 10, true),
    (rid, 'Hot Drinks', 'المشروبات الساخنة', 11, true),
    (rid, 'Cold Drinks', 'المشروبات الباردة', 12, true),
    (rid, 'Fresh Juices', 'العصائر الطازجة', 13, true)
  ON CONFLICT DO NOTHING;

  -- Starters
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Crispy Calamari','حبار مقلي','Lightly battered calamari with marinara sauce',42::numeric,true),
    ('Bruschetta Al Pomodoro','بروسكيتا','Toasted sourdough with fresh tomatoes and basil',35::numeric,false),
    ('Chicken Wings','أجنحة دجاج','8 pcs crispy wings with choice of sauce',52::numeric,true),
    ('Cheese Spring Rolls','سمبوسة جبن','4 pcs golden spring rolls with sweet chili',38::numeric,false),
    ('Hummus & Pita','حمص وخبز','Creamy hummus with warm pita bread',28::numeric,false),
    ('Stuffed Mushrooms','مشروم محشي','Button mushrooms stuffed with cream cheese',44::numeric,false)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Starters' AND c.restaurant_id = rid;

  -- Soups
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Tomato Bisque','شوربة طماطم','Roasted tomato soup with cream',32::numeric,false),
    ('Mushroom Cream Soup','شوربة مشروم','Wild mushroom with truffle cream',38::numeric,false),
    ('Lentil Soup','شوربة عدس','Traditional red lentil with lemon',28::numeric,false)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Soups' AND c.restaurant_id = rid;

  -- Salads
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Caesar Salad','سيزر سلطة','Romaine, parmesan, croutons, caesar dressing',48::numeric,false),
    ('Greek Salad','سلطة يونانية','Tomato, cucumber, olives, feta cheese',42::numeric,false),
    ('Rocket & Parmesan','سلطة الجرجير','Baby rocket, shaved parmesan, lemon dressing',44::numeric,false),
    ('Grilled Halloumi Salad','سلطة حلومي','Grilled halloumi with mixed greens',52::numeric,true)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Salads' AND c.restaurant_id = rid;

  -- Burgers
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Classic Smash Burger','برغر كلاسيك','Double smash patty, cheddar, pickles, special sauce',68::numeric,true),
    ('BBQ Bacon Burger','برغر باربكيو','Beef patty, streaky bacon, BBQ sauce, onion rings',75::numeric,true),
    ('Mushroom Swiss Burger','برغر مشروم','Beef patty, sauteed mushrooms, swiss cheese',72::numeric,false),
    ('Crispy Chicken Burger','برغر دجاج مقلي','Buttermilk fried chicken, slaw, sriracha mayo',65::numeric,false),
    ('Veggie Burger','برغر نباتي','Black bean patty, avocado, tomato, lettuce',58::numeric,false)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Burgers' AND c.restaurant_id = rid;

  -- Grills
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Ribeye Steak 300g','ريب آي ستيك','300g prime ribeye with fries and sauce',185::numeric,true),
    ('Grilled Chicken','دجاج مشوي','Half chicken marinated in herbs and spices',88::numeric,false),
    ('Mixed Grill Platter','مشاوي مشكلة','Chicken, kofta, shrimp and lamb chops',165::numeric,true),
    ('Lamb Chops','كوتليت لحم غنم','4 pcs marinated lamb chops with mint sauce',145::numeric,false),
    ('Grilled Salmon','سلمون مشوي','Atlantic salmon with lemon butter and vegetables',135::numeric,false)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Grills' AND c.restaurant_id = rid;

  -- Pasta & Risotto
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Spaghetti Bolognese','سباغيتي بولونيز','Slow-cooked beef ragu with parmesan',72::numeric,false),
    ('Penne Arrabbiata','بيني أرابياتا','Spicy tomato sauce with fresh basil',58::numeric,false),
    ('Fettuccine Alfredo','فيتوتشيني ألفريدو','Creamy parmesan sauce with fettuccine',68::numeric,false),
    ('Seafood Linguine','لينغويني بحري','Prawns, calamari, clams in white wine sauce',98::numeric,true),
    ('Mushroom Risotto','ريزوتو مشروم','Arborio rice with wild mushrooms and truffle oil',85::numeric,false)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Pasta & Risotto' AND c.restaurant_id = rid;

  -- Seafood
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Grilled Sea Bass','باس البحر المشوي','Whole sea bass with herbs and lemon',125::numeric,true),
    ('Prawn Skewers','أسياخ الروبيان','6 tiger prawns grilled with garlic butter',115::numeric,false),
    ('Fish & Chips','فيش آند تشيبس','Beer-battered fish with chunky fries',78::numeric,false),
    ('Lobster Thermidor','لوبستر ثيرميدور','Half lobster in creamy thermidor sauce',225::numeric,true)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Seafood' AND c.restaurant_id = rid;

  -- Sandwiches & Wraps
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Club Sandwich','كلوب سندويش','Triple-decker with chicken, bacon, egg, lettuce',62::numeric,false),
    ('Grilled Chicken Wrap','رابة دجاج مشوي','Grilled chicken with garlic sauce and veggies',55::numeric,false),
    ('Falafel Wrap','رابة فلافل','Crispy falafel with tahini and salad',42::numeric,false),
    ('Beef Shawarma','شاورما لحم','Marinated beef with pickles and garlic sauce',48::numeric,false)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Sandwiches & Wraps' AND c.restaurant_id = rid;

  -- Sides
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Truffle Fries','بطاطس كمأة','Crispy fries with truffle oil and parmesan',38::numeric,true),
    ('Sweet Potato Fries','بطاطا حلوة','Golden sweet potato fries with dip',32::numeric,false),
    ('Onion Rings','حلقات البصل','Beer-battered onion rings',28::numeric,false),
    ('Grilled Vegetables','خضروات مشوية','Seasonal vegetables with olive oil',32::numeric,false),
    ('Steamed Rice','أرز','Plain steamed basmati rice',18::numeric,false)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Sides' AND c.restaurant_id = rid;

  -- Desserts
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Chocolate Lava Cake','كيكة الشوكولاتة','Warm chocolate cake with vanilla ice cream',52::numeric,true),
    ('Creme Brulee','كريم بروليه','Classic vanilla creme brulee',45::numeric,false),
    ('Tiramisu','تيراميسو','Italian coffee dessert with mascarpone',48::numeric,false),
    ('Cheesecake','تشيز كيك','New York style with berry compote',48::numeric,true),
    ('Umm Ali','أم علي','Traditional Egyptian bread pudding',38::numeric,false),
    ('Ice Cream 3 scoops','آيس كريم','Choice of flavors',32::numeric,false)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Desserts' AND c.restaurant_id = rid;

  -- Hot Drinks
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Espresso','إسبريسو','Single shot espresso',18::numeric,false),
    ('Double Espresso','دبل إسبريسو','Double shot espresso',22::numeric,false),
    ('Cappuccino','كابتشينو','Espresso with steamed milk foam',28::numeric,false),
    ('Flat White','فلات وايت','Double ristretto with microfoam milk',28::numeric,false),
    ('Latte','لاتيه','Espresso with steamed milk',28::numeric,false),
    ('Americano','أمريكانو','Espresso with hot water',22::numeric,false),
    ('Turkish Coffee','قهوة تركية','Traditional cardamom coffee',22::numeric,false),
    ('Arabic Coffee','قهوة عربية','Light roast with saffron',20::numeric,false),
    ('Karak Chai','كرك','Spiced milk tea',15::numeric,true),
    ('Mint Tea','شاي بالنعناع','Fresh mint with green tea',18::numeric,false)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Hot Drinks' AND c.restaurant_id = rid;

  -- Cold Drinks
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Soft Drinks','مشروبات غازية','Pepsi, 7Up, Mirinda, Diet Pepsi',12::numeric,false),
    ('Still Water','ماء معدني','500ml still mineral water',8::numeric,false),
    ('Sparkling Water','ماء فوار','500ml sparkling water',10::numeric,false),
    ('Iced Latte','لاتيه بارد','Espresso over ice with milk',32::numeric,false),
    ('Iced Matcha','ماتشا بارد','Japanese matcha with oat milk',35::numeric,true),
    ('Lemonade','ليمونادة','Fresh squeezed lemonade with mint',25::numeric,false),
    ('Virgin Mojito','موهيتو','Mint, lime, soda, sugar syrup',32::numeric,false)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Cold Drinks' AND c.restaurant_id = rid;

  -- Fresh Juices
  INSERT INTO menu_items (restaurant_id, category_id, name, name_ar, description, base_price, is_available, is_featured)
  SELECT rid, c.id, v.name, v.name_ar, v.description, v.price, true, v.featured
  FROM menu_categories c, (VALUES
    ('Orange Juice','عصير برتقال','Freshly squeezed orange juice',28::numeric,false),
    ('Watermelon Juice','عصير بطيخ','Cold pressed watermelon',25::numeric,false),
    ('Mango Juice','عصير مانجو','Fresh mango blend',30::numeric,false),
    ('Green Detox','عصير أخضر','Cucumber, apple, ginger, lemon',35::numeric,false),
    ('Mixed Berry Smoothie','سموذي توت','Strawberry, blueberry, banana',38::numeric,true)
  ) AS v(name, name_ar, description, price, featured)
  WHERE c.name = 'Fresh Juices' AND c.restaurant_id = rid;

  -- Expenses (last 30 days)
  INSERT INTO expenses (restaurant_id, category, description, amount, date) VALUES
    (rid, 'food_cost', 'Weekly produce — vegetables & herbs', 1850.00, CURRENT_DATE - 2),
    (rid, 'food_cost', 'Meat & seafood supplier', 4200.00, CURRENT_DATE - 2),
    (rid, 'food_cost', 'Dairy & dry goods', 980.00, CURRENT_DATE - 3),
    (rid, 'beverage_cost', 'Soft drinks & water restock', 620.00, CURRENT_DATE - 3),
    (rid, 'beverage_cost', 'Coffee beans & milk', 440.00, CURRENT_DATE - 5),
    (rid, 'labor', 'Chef salaries — May', 18000.00, CURRENT_DATE - 7),
    (rid, 'labor', 'Service staff wages — May', 12500.00, CURRENT_DATE - 7),
    (rid, 'utilities', 'DEWA electricity & water', 3200.00, CURRENT_DATE - 10),
    (rid, 'rent', 'Monthly rent — Dubai Marina', 22000.00, CURRENT_DATE - 15),
    (rid, 'maintenance', 'Kitchen equipment service', 650.00, CURRENT_DATE - 18),
    (rid, 'marketing', 'Instagram ads & promotion', 800.00, CURRENT_DATE - 20),
    (rid, 'other', 'Disposables & packaging', 320.00, CURRENT_DATE - 22);

END $$;

-- Ember & Oak — Realistic Floor Plan Layout (percentage-based coordinates)
-- pos_x and pos_y are 0-100 (percentage of canvas width/height)

-- Old tables (reposition to blend in)
UPDATE restaurant_tables SET pos_x = 8,  pos_y = 18, shape = 'round' WHERE table_number = '1';
UPDATE restaurant_tables SET pos_x = 8,  pos_y = 38, shape = 'round' WHERE table_number = '2';
UPDATE restaurant_tables SET pos_x = 8,  pos_y = 58, shape = 'round' WHERE table_number = '3';

-- Main Dining Area (center)
UPDATE restaurant_tables SET pos_x = 22, pos_y = 14, shape = 'round'      WHERE table_number = 'T3';
UPDATE restaurant_tables SET pos_x = 36, pos_y = 14, shape = 'round'      WHERE table_number = 'T4';
UPDATE restaurant_tables SET pos_x = 50, pos_y = 14, shape = 'round'      WHERE table_number = 'T5';
UPDATE restaurant_tables SET pos_x = 22, pos_y = 38, shape = 'rect'       WHERE table_number = 'T6';
UPDATE restaurant_tables SET pos_x = 40, pos_y = 38, shape = 'rect'       WHERE table_number = 'T7';
UPDATE restaurant_tables SET pos_x = 50, pos_y = 58, shape = 'round'      WHERE table_number = 'T10';

-- Couples / Window seats (right side)
UPDATE restaurant_tables SET pos_x = 64, pos_y = 14, shape = 'round'      WHERE table_number = 'T1';
UPDATE restaurant_tables SET pos_x = 64, pos_y = 36, shape = 'round'      WHERE table_number = 'T2';
UPDATE restaurant_tables SET pos_x = 64, pos_y = 58, shape = 'round'      WHERE table_number = 'T9';

-- Bar stools (top right corner)
UPDATE restaurant_tables SET pos_x = 78, pos_y = 10, shape = 'round'      WHERE table_number = 'Bar 1';
UPDATE restaurant_tables SET pos_x = 87, pos_y = 10, shape = 'round'      WHERE table_number = 'Bar 2';

-- Large group table (center bottom)
UPDATE restaurant_tables SET pos_x = 28, pos_y = 62, shape = 'rect-large' WHERE table_number = 'T8';

-- VIP private section (far right)
UPDATE restaurant_tables SET pos_x = 78, pos_y = 42, shape = 'rect-large' WHERE table_number = 'VIP';

-- Terrace (bottom strip)
UPDATE restaurant_tables SET pos_x = 22, pos_y = 84, shape = 'rect'       WHERE table_number = 'Terrace 1';
UPDATE restaurant_tables SET pos_x = 44, pos_y = 84, shape = 'rect'       WHERE table_number = 'Terrace 2';

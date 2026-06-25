-- Create tables
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    role VARCHAR(100) NOT NULL,
    salary INTEGER NOT NULL,
    joined_at DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    ordered_at TIMESTAMP DEFAULT NOW()
);

-- ─── Seed Employees (50 records) ────────────────────────────────────────────
INSERT INTO employees (name, department, role, salary, joined_at, status) VALUES
-- Engineering
('Alice Johnson',      'Engineering',  'Senior Engineer',           95000, '2020-03-15', 'active'),
('David Lee',          'Engineering',  'Backend Developer',         88000, '2022-06-01', 'active'),
('Grace Kim',          'Engineering',  'DevOps Engineer',           97000, '2020-11-05', 'active'),
('Liam Parker',        'Engineering',  'Frontend Developer',        84000, '2021-04-12', 'active'),
('Noah Singh',         'Engineering',  'Full Stack Engineer',       91000, '2019-08-22', 'active'),
('Zoe Adams',          'Engineering',  'QA Engineer',               76000, '2022-01-18', 'active'),
('Ryan Patel',         'Engineering',  'Security Engineer',         99000, '2018-10-07', 'active'),
('Mei Zhang',          'Engineering',  'Machine Learning Engineer', 105000,'2021-07-30', 'active'),
('Carlos Rivera',      'Engineering',  'Platform Engineer',         93000, '2020-05-25', 'active'),
('Priya Nair',         'Engineering',  'Site Reliability Engineer', 98000, '2019-12-14', 'active'),
-- Marketing
('Bob Martinez',       'Marketing',    'Marketing Lead',            78000, '2019-07-22', 'active'),
('Sophie Turner',      'Marketing',    'Content Strategist',        67000, '2021-03-08', 'active'),
('Ethan Brooks',       'Marketing',    'SEO Specialist',            65000, '2022-09-19', 'active'),
('Lily Chen',          'Marketing',    'Growth Hacker',             72000, '2020-06-15', 'active'),
('Marcus Webb',        'Marketing',    'Brand Manager',             80000, '2018-11-28', 'active'),
-- HR
('Carol White',        'HR',           'HR Manager',                72000, '2021-01-10', 'active'),
('Nadia Russo',        'HR',           'Talent Acquisition Lead',   68000, '2022-04-05', 'active'),
('Samuel Clark',       'HR',           'HR Business Partner',       71000, '2020-09-16', 'active'),
('Tara Nguyen',        'HR',           'L&D Specialist',            64000, '2023-01-23', 'active'),
('Oliver Hughes',      'HR',           'Compensation Analyst',      69000, '2021-11-11', 'inactive'),
-- Design
('Eva Green',          'Design',       'UI/UX Designer',            82000, '2021-09-18', 'active'),
('Isla Thompson',      'Design',       'Graphic Designer',          68000, '2022-08-20', 'inactive'),
('Jordan Mills',       'Design',       'Product Designer',          85000, '2020-02-27', 'active'),
('Amara Osei',         'Design',       'Motion Designer',           77000, '2021-06-14', 'active'),
('Finn Larsen',        'Design',       'Design Systems Engineer',   88000, '2019-05-09', 'active'),
-- Sales
('Frank Chen',         'Sales',        'Sales Manager',             91000, '2018-04-30', 'active'),
('Jack Brown',         'Sales',        'Sales Rep',                 62000, '2023-05-10', 'active'),
('Kayla Scott',        'Sales',        'Account Executive',         74000, '2021-08-03', 'active'),
('Diego Morales',      'Sales',        'Business Dev Manager',      87000, '2019-10-21', 'active'),
('Hana Suzuki',        'Sales',        'Sales Rep',                 60000, '2023-03-17', 'active'),
('Victor Okonkwo',     'Sales',        'Enterprise Sales Lead',     95000, '2018-07-12', 'active'),
-- Finance
('Henry Wilson',       'Finance',      'Financial Analyst',         75000, '2023-02-14', 'active'),
('Alicia Gomez',       'Finance',      'Senior Accountant',         80000, '2020-08-30', 'active'),
('Derek Yuen',         'Finance',      'CFO',                      145000, '2017-03-01', 'active'),
('Simone Dupont',      'Finance',      'Budget Analyst',            72000, '2022-11-07', 'active'),
('Felix Wagner',       'Finance',      'Controller',                90000, '2019-06-18', 'active'),
-- Legal
('Naomi Reid',         'Legal',        'General Counsel',          138000, '2018-02-14', 'active'),
('Patrick Flynn',      'Legal',        'IP Attorney',               115000,'2020-01-20', 'active'),
('Vivienne Lamont',    'Legal',        'Compliance Officer',        95000, '2021-05-06', 'active'),
-- Operations
('George Mitchell',    'Operations',   'COO',                      155000, '2016-09-01', 'active'),
('Sandra Okeke',       'Operations',   'Operations Manager',        82000, '2019-04-15', 'active'),
('Tom Eriksson',       'Operations',   'Supply Chain Analyst',      70000, '2022-07-11', 'active'),
('Ling Xiao',          'Operations',   'Project Manager',           78000, '2021-02-28', 'active'),
-- Product
('Isabella Cruz',      'Product',      'CPO',                      148000, '2017-11-05', 'active'),
('James Okafor',       'Product',      'Product Manager',           98000, '2019-09-10', 'active'),
('Chloe Bennett',      'Product',      'Associate PM',              78000, '2023-06-01', 'active'),
('Ravi Sharma',        'Product',      'Senior PM',                108000, '2018-08-22', 'active'),
-- Customer Success
('Ava Robinson',       'Customer Success', 'CS Manager',            80000, '2020-04-07', 'active'),
('Leo Fernandez',      'Customer Success', 'CS Specialist',         60000, '2022-10-18', 'active'),
('Mia Johansson',      'Customer Success', 'CS Lead',               73000, '2021-12-01', 'inactive');

-- ─── Seed Products (30 records) ─────────────────────────────────────────────
INSERT INTO products (name, category, price, stock) VALUES
-- Electronics
('Wireless Keyboard',            'Electronics',  49.99,  150),
('Ergonomic Mouse',              'Electronics',  35.50,  200),
('Noise Cancelling Headphones',  'Electronics', 199.99,   60),
('USB-C Hub',                    'Electronics',  55.00,  120),
('Webcam 4K',                    'Electronics', 129.99,   45),
('Ultrawide Monitor 34"',        'Electronics', 799.99,   18),
('Laptop Stand',                 'Electronics',  39.99,  180),
('Mechanical Keyboard',          'Electronics',  89.99,   95),
('Wireless Charger Pad',         'Electronics',  29.99,  220),
('Smart Desk Organizer',         'Electronics',  65.00,   85),
-- Furniture
('Standing Desk',                'Furniture',   399.00,   30),
('Monitor Stand',                'Furniture',    89.99,   80),
('Office Chair',                 'Furniture',   450.00,   25),
('Ergonomic Footrest',           'Furniture',    49.99,  110),
('Whiteboard 48"',               'Furniture',   149.00,   40),
('Mobile Pedestal Drawer',       'Furniture',   175.00,   35),
('Sofa Lounge Chair',            'Furniture',   620.00,   12),
('Adjustable Laptop Arm',        'Furniture',    79.99,   65),
-- Office
('Whiteboard',                   'Office',       75.00,   70),
('Desk Lamp',                    'Office',       45.00,  100),
('Cable Management Kit',         'Office',       18.99,  300),
('Sticky Notes Set',             'Office',        8.99,  500),
('Premium Planner 2025',         'Office',       22.50,  250),
('Paper Shredder',               'Office',       89.00,   38),
('Label Maker',                  'Office',       34.99,  145),
-- Software
('Project Management License',   'Software',    120.00,  999),
('Design Suite Annual License',  'Software',    599.00,  999),
('Cloud Storage 1TB/year',       'Software',    119.99,  999),
('VPN Business Plan',            'Software',     89.99,  999),
('Password Manager Team Plan',   'Software',     59.99,  999);

-- ─── Seed Orders (60 records) ───────────────────────────────────────────────
INSERT INTO orders (employee_id, product_id, quantity, total_amount, ordered_at) VALUES
-- 2025 Q4
(1,  1,  2,    99.98, '2025-10-02 09:14:00'),
(1,  3,  1,   199.99, '2025-10-05 11:30:00'),
(2,  11, 1,   399.00, '2025-10-08 14:22:00'),
(3,  19, 2,   150.00, '2025-10-12 10:05:00'),
(4,  5,  3,   389.97, '2025-10-15 16:45:00'),
(5,  12, 1,    89.99, '2025-10-18 09:00:00'),
(6,  13, 2,   900.00, '2025-10-20 13:30:00'),
(7,  4,  1,    55.00, '2025-10-25 11:15:00'),
(8,  2,  4,   142.00, '2025-10-29 15:00:00'),
(9,  20, 2,    90.00, '2025-11-01 10:30:00'),
(10, 1,  1,    49.99, '2025-11-04 12:00:00'),
(11, 26, 5,   600.00, '2025-11-07 09:45:00'),
(12, 6,  1,   799.99, '2025-11-10 14:00:00'),
(13, 27, 3,  1797.00, '2025-11-13 10:00:00'),
(14, 7,  2,    79.98, '2025-11-16 11:30:00'),
(15, 28, 2,   239.98, '2025-11-19 15:45:00'),
(16, 3,  1,   199.99, '2025-11-21 09:30:00'),
(17, 8,  2,   179.98, '2025-11-24 13:00:00'),
(18, 29, 4,   359.96, '2025-11-27 16:20:00'),
(19, 9,  3,    89.97, '2025-11-30 10:00:00'),
-- 2025 Q3
(20, 10, 1,    65.00, '2025-08-03 09:00:00'),
(21, 13, 1,   450.00, '2025-08-07 11:00:00'),
(22, 14, 2,    99.98, '2025-08-11 14:30:00'),
(23, 5,  2,   259.98, '2025-08-15 10:15:00'),
(24, 11, 1,   399.00, '2025-08-19 13:45:00'),
(25, 1,  3,   149.97, '2025-08-22 09:30:00'),
(26, 6,  1,   799.99, '2025-08-26 16:00:00'),
(27, 16, 1,   175.00, '2025-08-29 11:30:00'),
(28, 30, 10,  599.90, '2025-09-02 10:00:00'),
(29, 2,  5,   177.50, '2025-09-05 14:00:00'),
(30, 17, 1,   620.00, '2025-09-09 09:45:00'),
(31, 26, 2,   240.00, '2025-09-12 11:00:00'),
(32, 4,  2,   110.00, '2025-09-15 15:30:00'),
(33, 8,  1,    89.99, '2025-09-18 10:30:00'),
(34, 27, 1,   599.00, '2025-09-21 13:00:00'),
(35, 3,  1,   199.99, '2025-09-24 09:15:00'),
-- 2025 Q2
(36, 20, 4,   180.00, '2025-04-02 10:00:00'),
(37, 12, 2,   179.98, '2025-04-08 14:00:00'),
(38, 15, 1,   149.00, '2025-04-14 11:30:00'),
(39, 18, 2,   159.98, '2025-04-20 09:00:00'),
(40, 9,  5,   149.95, '2025-04-26 16:00:00'),
(41, 5,  1,   129.99, '2025-05-05 10:15:00'),
(42, 11, 1,   399.00, '2025-05-10 13:30:00'),
(43, 28, 3,   359.97, '2025-05-16 11:00:00'),
(44, 2,  6,   213.00, '2025-05-22 15:00:00'),
(45, 6,  1,   799.99, '2025-05-28 09:30:00'),
(46, 21, 2,    99.98, '2025-06-03 14:00:00'),
(47, 10, 1,    65.00, '2025-06-09 10:45:00'),
(48, 29, 5,   449.95, '2025-06-14 11:30:00'),
(49, 7,  3,   119.97, '2025-06-20 13:00:00'),
-- 2025 Q1
(50, 1,  4,   199.96, '2025-01-06 10:00:00'),
(1,  13, 1,   450.00, '2025-01-12 14:30:00'),
(2,  26, 3,   360.00, '2025-01-20 11:00:00'),
(3,  5,  1,   129.99, '2025-02-03 09:00:00'),
(4,  11, 2,   798.00, '2025-02-10 15:00:00'),
(5,  3,  1,   199.99, '2025-02-18 10:30:00'),
(6,  27, 2,  1198.00, '2025-03-04 13:45:00'),
(7,  6,  1,   799.99, '2025-03-11 09:15:00'),
(8,  28, 4,   479.96, '2025-03-18 14:00:00'),
(9,  30, 6,   359.94, '2025-03-25 11:00:00');

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

-- Seed employees
INSERT INTO employees (name, department, role, salary, joined_at, status) VALUES
('Alice Johnson',    'Engineering',  'Senior Engineer',      95000, '2020-03-15', 'active'),
('Bob Martinez',     'Marketing',    'Marketing Lead',       78000, '2019-07-22', 'active'),
('Carol White',      'HR',           'HR Manager',           72000, '2021-01-10', 'active'),
('David Lee',        'Engineering',  'Backend Developer',    88000, '2022-06-01', 'active'),
('Eva Green',        'Design',       'UI/UX Designer',       82000, '2021-09-18', 'active'),
('Frank Chen',       'Sales',        'Sales Manager',        91000, '2018-04-30', 'active'),
('Grace Kim',        'Engineering',  'DevOps Engineer',      97000, '2020-11-05', 'active'),
('Henry Wilson',     'Finance',      'Financial Analyst',    75000, '2023-02-14', 'active'),
('Isla Thompson',    'Design',       'Graphic Designer',     68000, '2022-08-20', 'inactive'),
('Jack Brown',       'Sales',        'Sales Rep',            62000, '2023-05-10', 'active');

-- Seed products
INSERT INTO products (name, category, price, stock) VALUES
('Wireless Keyboard',   'Electronics',  49.99,  150),
('Ergonomic Mouse',     'Electronics',  35.50,  200),
('Standing Desk',       'Furniture',    399.00,  30),
('Monitor Stand',       'Furniture',    89.99,   80),
('Noise Cancelling Headphones', 'Electronics', 199.99, 60),
('Office Chair',        'Furniture',    450.00,  25),
('USB-C Hub',           'Electronics',  55.00,  120),
('Webcam 4K',           'Electronics',  129.99,  45),
('Whiteboard',          'Office',       75.00,   70),
('Desk Lamp',           'Office',       45.00,  100);

-- Seed orders
INSERT INTO orders (employee_id, product_id, quantity, total_amount) VALUES
(1, 1, 2,   99.98),
(1, 5, 1,  199.99),
(2, 3, 1,  399.00),
(3, 9, 2,  150.00),
(4, 7, 3,  165.00),
(5, 4, 1,   89.99),
(6, 6, 2,  900.00),
(7, 8, 1,  129.99),
(8, 2, 4,  142.00),
(9, 10,2,   90.00),
(10,1, 1,   49.99),
(4, 5, 2,  399.98);

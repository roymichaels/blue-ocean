const sqlite3 = require('sqlite3').verbose();
const { faker } = require('@faker-js/faker');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../sqlite/db.sqlite');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function seed() {
  const tenants = ['thecongress', 'thebull'];
  const users = Array.from({ length: 5 }).map(() => ({
    id: `user_${Date.now()}_${faker.number.int()}`,
    matrix_user_id: faker.string.uuid(),
    app_username: faker.internet.userName(),
    email: faker.internet.email(),
    display_name: faker.person.fullName(),
    role: 'user',
    tenant_id: faker.helpers.arrayElement(tenants),
  }));

  for (const u of users) {
    await run(
      'INSERT INTO user_profiles (id, tenant_id, matrix_user_id, app_username, email, display_name, role) VALUES (?,?,?,?,?,?,?)',
      [u.id, u.tenant_id, u.matrix_user_id, u.app_username, u.email, u.display_name, u.role],
    );
  }

  const catRows = await all('SELECT id FROM categories');
  const categoryIds = catRows.map((c) => c.id);

  const products = Array.from({ length: 10 }).map(() => ({
    id: `prod_${Date.now()}_${faker.number.int()}`,
    tenant_id: faker.helpers.arrayElement(tenants),
    name: faker.commerce.productName(),
    price: Number(faker.commerce.price({ min: 5, max: 100 })),
    description: faker.commerce.productDescription(),
    category: faker.helpers.arrayElement(categoryIds),
    images: JSON.stringify([faker.image.url()]),
    stock: faker.number.int({ min: 0, max: 100 }),
  }));
  for (const p of products) {
    await run(
      'INSERT INTO products (id,tenant_id,name,price,description,category,images,stock,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [p.id, p.tenant_id, p.name, p.price, p.description, p.category, p.images, p.stock, Date.now(), Date.now()],
    );
  }

  const prodRows = await all('SELECT id FROM products');
  const userRows = await all('SELECT id FROM user_profiles');
  const productIds = prodRows.map((p) => p.id);
  const userIds = userRows.map((u) => u.id);

  const orders = [];
  const orderItems = [];
  for (let i = 0; i < 5; i++) {
    const userId = faker.helpers.arrayElement(userIds);
    const orderId = `order_${Date.now()}_${i}`;
    orders.push({
      id: orderId,
      tenant_id: faker.helpers.arrayElement(tenants),
      user_id: userId,
      total: 0,
      status: 'pending',
      payment_method: 'cash_on_delivery',
      shipping_name: faker.person.fullName(),
      shipping_phone: faker.phone.number(),
      shipping_street: faker.location.streetAddress(),
      shipping_city: faker.location.city(),
      shipping_postal_code: faker.location.zipCode(),
      shipping_notes: faker.lorem.sentence(),
    });
  }

  for (const order of orders) {
    await run(
      'INSERT INTO orders (id,tenant_id,user_id,total,status,payment_method,shipping_name,shipping_phone,shipping_street,shipping_city,shipping_postal_code,shipping_notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        order.id,
        order.tenant_id,
        order.user_id,
        order.total,
        order.status,
        order.payment_method,
        order.shipping_name,
        order.shipping_phone,
        order.shipping_street,
        order.shipping_city,
        order.shipping_postal_code,
        order.shipping_notes,
        Date.now(),
        Date.now(),
      ],
    );

    const itemsCount = faker.number.int({ min: 1, max: 3 });
    for (let j = 0; j < itemsCount; j++) {
      const productId = faker.helpers.arrayElement(productIds);
      const price = Number(faker.commerce.price({ min: 5, max: 100 }));
      const quantity = faker.number.int({ min: 1, max: 5 });
      orderItems.push({
        id: `oi_${Date.now()}_${j}`,
        order_id: order.id,
        product_id: productId,
        product_name: faker.commerce.productName(),
        product_image: faker.image.url(),
        quantity,
        price,
      });
      order.total += price * quantity;
    }

    await run('UPDATE orders SET total=? WHERE id=?', [order.total, order.id]);
  }

  for (const item of orderItems) {
    await run(
      'INSERT INTO order_items (id,order_id,product_id,product_name,product_image,quantity,price) VALUES (?,?,?,?,?,?,?)',
      [
        item.id,
        item.order_id,
        item.product_id,
        item.product_name,
        item.product_image,
        item.quantity,
        item.price,
      ],
    );
  }

  const tenantRows = tenants.map((t) => ({
    tenant_id: t,
    platform_name: faker.company.name(),
    platform_logo: faker.image.url(),
    theme_color: faker.color.rgb(),
  }));
  for (const row of tenantRows) {
    await run(
      'INSERT OR REPLACE INTO tenant_settings (tenant_id, platform_name, platform_logo, theme_color) VALUES (?,?,?,?)',
      [row.tenant_id, row.platform_name, row.platform_logo, row.theme_color],
    );
  }

  console.log('Seed data inserted');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

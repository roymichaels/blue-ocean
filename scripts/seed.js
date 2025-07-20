const { createClient } = require('@supabase/supabase-js');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function seed() {
  const users = Array.from({ length: 5 }).map(() => ({
    matrix_user_id: faker.string.uuid(),
    app_username: faker.internet.userName(),
    email: faker.internet.email(),
    display_name: faker.person.fullName(),
    role: 'user',
  }));
  await supabase.from('user_profiles').insert(users);

  const { data: catRows } = await supabase.from('categories').select('id');
  const categoryIds = catRows ? catRows.map((c) => c.id) : [];

  const products = Array.from({ length: 10 }).map(() => ({
    name: faker.commerce.productName(),
    price: Number(faker.commerce.price({ min: 5, max: 100 })),
    description: faker.commerce.productDescription(),
    category: faker.helpers.arrayElement(categoryIds),
    images: [faker.image.url()],
    stock: faker.number.int({ min: 0, max: 100 }),
  }));
  await supabase.from('products').insert(products);

  const { data: prodRows } = await supabase.from('products').select('id');
  const { data: userRows } = await supabase.from('user_profiles').select('id');
  const productIds = prodRows ? prodRows.map((p) => p.id) : [];
  const userIds = userRows ? userRows.map((u) => u.id) : [];

  const orders = [];
  const orderItems = [];
  for (let i = 0; i < 5; i++) {
    const userId = faker.helpers.arrayElement(userIds);
    const order = {
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
    };
    orders.push(order);
  }
  const { data: insertedOrders } = await supabase
    .from('orders')
    .insert(orders)
    .select();

  insertedOrders.forEach((order) => {
    const itemsCount = faker.number.int({ min: 1, max: 3 });
    for (let j = 0; j < itemsCount; j++) {
      const productId = faker.helpers.arrayElement(productIds);
      const price = Number(faker.commerce.price({ min: 5, max: 100 }));
      const quantity = faker.number.int({ min: 1, max: 5 });
      orderItems.push({
        order_id: order.id,
        product_id: productId,
        product_name: faker.commerce.productName(),
        product_image: faker.image.url(),
        quantity,
        price,
      });
      order.total += price * quantity;
    }
  });

  await supabase.from('order_items').insert(orderItems);

  await Promise.all(
    insertedOrders.map((o) =>
      supabase.from('orders').update({ total: o.total }).eq('id', o.id),
    ),
  );

  const tenantRows = ['thecongress', 'thebull'].map((t) => ({
    tenant: t,
    platform_name: faker.company.name(),
    platform_logo: faker.image.url(),
    theme_color: faker.color.rgb(),
  }));
  await supabase.from('tenant_settings').upsert(tenantRows);

  console.log('Seed data inserted');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

#!/usr/bin/env node
require('dotenv/config');

try {
  require('ts-node/register');
} catch (err) {
  console.error('ts-node is required to run this script');
  process.exit(1);
}

const { faker } = require('@faker-js/faker');
const { store } = require('../lib/memoryStore');
const fs = require('fs');
const path = require('path');

async function seed() {
  const tenants = ['blue-ocean', 'thebull'];

  // Users
  const users = Array.from({ length: 5 }).map(() => ({
    id: `user_${Date.now()}_${faker.number.int()}`,
    username: faker.internet.userName(),
    email: faker.internet.email(),
    displayName: faker.person.fullName(),
    role: 'user',
    tenant_id: faker.helpers.arrayElement(tenants),
    isAdmin: false,
  }));
  store.users.push(...users);

  // Stores (sellers)
  const stores = Array.from({ length: 9 }).map(() => ({
    id: `store_${Date.now()}_${faker.number.int()}`,
    name: faker.company.name(),
    owner: faker.person.fullName(),
    nftId: faker.string.uuid(),
    reputation: faker.number.float({ min: 0, max: 5, precision: 0.1 }),
  }));
  // Ensure a stable demo store for the app
  const alpha = { id: 'alpha', name: 'Alpha Store', owner: 'demo', nftId: '', reputation: 0 };
  stores.unshift(alpha);
  store.stores.push(...stores);

  // Products
  const categories = ['general', 'misc'];
  const products = Array.from({ length: 100 }).map((_, i) => ({
    id: `prod_${Date.now()}_${faker.number.int()}`,
    tenant_id: faker.helpers.arrayElement(tenants),
    // Bias first 16 products to Alpha so the demo store has visible inventory
    storeId: i < 16 ? 'alpha' : faker.helpers.arrayElement(stores).id,
    name: faker.commerce.productName(),
    price: Number(faker.commerce.price({ min: 5, max: 100 })),
    description: faker.commerce.productDescription(),
    category: faker.helpers.arrayElement(categories),
    images: [faker.image.url()],
    rating: 0,
    reviews: 0,
    stock: faker.number.int({ min: 0, max: 100 }),
  }));
  store.products.push(...products);

  // Orders
  const orders = [];
  for (let i = 0; i < 5; i++) {
    const user = faker.helpers.arrayElement(store.users);
    const orderId = `order_${Date.now()}_${i}`;
    const items = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }).map(() => {
      const product = faker.helpers.arrayElement(store.products);
      const quantity = faker.number.int({ min: 1, max: 5 });
      return {
        id: `oi_${Date.now()}_${faker.number.int()}`,
        productId: product.id,
        product,
        quantity,
        addedAt: new Date().toISOString(),
        unitPrice: product.price,
      };
    });
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    orders.push({
      id: orderId,
      tenant_id: faker.helpers.arrayElement(tenants),
      userId: user.id,
      items,
      total,
      status: 'pending',
      paymentMethod: 'cash_on_delivery',
      shippingAddress: {
        name: faker.person.fullName(),
        phone: faker.phone.number(),
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        postalCode: faker.location.zipCode(),
        notes: faker.lorem.sentence(),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackingSteps: [],
    });
  }
  store.orders.push(...orders);

  // Notifications
  const notifications = Array.from({ length: 5 }).map(() => ({
    id: `ntf_${Date.now()}_${faker.number.int()}`,
    userId: faker.helpers.arrayElement(store.users).id,
    title: faker.lorem.words({ min: 2, max: 5 }),
    message: faker.lorem.sentence(),
    type: 'system',
    read: false,
    timestamp: Date.now(),
  }));
  store.notifications.push(...notifications);

  // Tenant settings
  for (const tenant of tenants) {
    store.tenantSettings[tenant] = {
      tenant_id: tenant,
      platform_name: faker.company.name(),
      platform_logo: faker.image.url(),
      theme_color: faker.color.rgb(),
    };
  }

  // Write seed data to JSON fixture
  const outputPath = path.join(__dirname, '../assets/seed');
  fs.mkdirSync(outputPath, { recursive: true });
  const seedData = {
    users: store.users,
    stores: store.stores,
    products: store.products,
    orders: store.orders,
    notifications: store.notifications,
    tenantSettings: store.tenantSettings,
  };
  fs.writeFileSync(
    path.join(outputPath, 'seed-data.json'),
    JSON.stringify(seedData, null, 2),
  );

  console.log('Seed data inserted into memory store');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

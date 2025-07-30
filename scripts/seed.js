#!/usr/bin/env node

try {
  require('ts-node/register');
} catch (err) {
  console.error('ts-node is required to run this script');
  process.exit(1);
}

const { faker } = require('@faker-js/faker');
const { store } = require('../lib/memoryStore');

async function seed() {
  const tenants = ['thecongress', 'thebull'];

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

  // Products
  const categories = ['general', 'misc'];
  const products = Array.from({ length: 10 }).map(() => ({
    id: `prod_${Date.now()}_${faker.number.int()}`,
    tenant_id: faker.helpers.arrayElement(tenants),
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

  console.log('Seed data inserted into memory store');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

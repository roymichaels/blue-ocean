import React from 'react';
import renderer, { act } from 'react-test-renderer';
import OrderRevenueMetrics from '../components/OrderRevenueMetrics';

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { text: { primary: '#000' } } }),
}));

jest.mock('../services/tonOrders', () => ({
  listOrdersBySeller: jest.fn(async () => [
    { id: '1', total: 10 } as any,
    { id: '2', total: 5 } as any,
  ]),
}));

describe('OrderRevenueMetrics', () => {
  it('renders totals for orders and revenue', async () => {
    let root: renderer.ReactTestRenderer;
    await act(async () => {
      root = renderer.create(<OrderRevenueMetrics storeId="s1" />);
    });
    const tree = root!.toJSON();
    expect(JSON.stringify(tree)).toContain('Orders: 2');
    expect(JSON.stringify(tree)).toContain('Revenue: 15.00');
  });
});

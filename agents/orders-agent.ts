import { Order } from '../types';
import { sendWakuOrderUpdate } from '../lib/waku/sendWakuOrderUpdate';
import WakuAgent from '../utils/wakuAgent';

class OrdersAgent extends WakuAgent<Order> {
  constructor() {
    super(sendWakuOrderUpdate);
  }
}

export default new OrdersAgent();

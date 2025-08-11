class EscrowSim {
  buyer: string;
  seller: string;
  admin: string;
  amount: number;
  disputeWindow: number;
  start: number;
  now: number;
  status: number; // 0 pending, 1 released, 2 refunded
  lastRecipient: string | null;

  constructor(buyer: string, seller: string, admin: string, amount: number, disputeWindow: number) {
    this.buyer = buyer;
    this.seller = seller;
    this.admin = admin;
    this.amount = amount;
    this.disputeWindow = disputeWindow;
    this.start = 0;
    this.now = 0;
    this.status = 0;
    this.lastRecipient = null;
  }

  private expired() {
    return this.now >= this.start + this.disputeWindow;
  }

  advance(seconds: number) {
    this.now += seconds;
  }

  release(sender: string) {
    if (this.status !== 0) throw new Error('finalized');
    if (!this.expired()) {
      if (sender !== this.buyer) throw new Error('not allowed');
    } else {
      if (sender !== this.buyer && sender !== this.seller) throw new Error('not allowed');
    }
    this.status = 1;
    this.lastRecipient = this.seller;
  }

  refund(sender: string) {
    if (this.status !== 0) throw new Error('finalized');
    if (!this.expired()) {
      if (sender !== this.seller) throw new Error('not allowed');
    } else {
      if (sender !== this.buyer && sender !== this.seller) throw new Error('not allowed');
    }
    this.status = 2;
    this.lastRecipient = this.buyer;
  }

  adminResolve(sender: string, toSeller: boolean) {
    if (this.status !== 0) throw new Error('finalized');
    if (sender !== this.admin) throw new Error('not admin');
    this.status = toSeller ? 1 : 2;
    this.lastRecipient = toSeller ? this.seller : this.buyer;
  }
}

describe('EscrowSim', () => {
  const buyer = 'buyer';
  const seller = 'seller';
  const admin = 'admin';
  const amount = 100;
  const dispute = 10;

  test('buyer releases before timeout', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute);
    e.release(buyer);
    expect(e.status).toBe(1);
    expect(e.lastRecipient).toBe(seller);
  });

  test('seller cannot release before timeout', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute);
    expect(() => e.release(seller)).toThrow();
    expect(e.status).toBe(0);
  });

  test('seller refunds before timeout', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute);
    e.refund(seller);
    expect(e.status).toBe(2);
    expect(e.lastRecipient).toBe(buyer);
  });

  test('buyer cannot refund before timeout', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute);
    expect(() => e.refund(buyer)).toThrow();
  });

  test('seller releases after timeout', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute);
    e.advance(dispute + 1);
    e.release(seller);
    expect(e.status).toBe(1);
    expect(e.lastRecipient).toBe(seller);
  });

  test('buyer refunds after timeout', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute);
    e.advance(dispute + 1);
    e.refund(buyer);
    expect(e.status).toBe(2);
    expect(e.lastRecipient).toBe(buyer);
  });

  test('admin resolves to seller', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute);
    e.adminResolve(admin, true);
    expect(e.status).toBe(1);
    expect(e.lastRecipient).toBe(seller);
  });

  test('unauthorized admin resolve rejected', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute);
    expect(() => e.adminResolve('other', true)).toThrow();
  });
});

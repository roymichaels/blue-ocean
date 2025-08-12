class EscrowSim {
  buyer: string;
  seller: string;
  admin: string;
  amount: number;
  disputeWindow: number;
  start: number;
  now: number;
  status: number; // 0 pending, 1 released, 2 refunded
  transfers: { to: string; amount: number }[];
  feeBps: number;
  feeRecipient: string;

  constructor(
    buyer: string,
    seller: string,
    admin: string,
    amount: number,
    disputeWindow: number,
    feeBps: number,
    feeRecipient: string,
  ) {
    this.buyer = buyer;
    this.seller = seller;
    this.admin = admin;
    this.amount = amount;
    this.disputeWindow = disputeWindow;
    this.start = 0;
    this.now = 0;
    this.status = 0;
    this.transfers = [];
    this.feeBps = feeBps;
    this.feeRecipient = feeRecipient;
  }

  private expired() {
    return this.now >= this.start + this.disputeWindow;
  }

  advance(seconds: number) {
    this.now += seconds;
  }

  private feeAmount() {
    return Math.floor((this.amount * this.feeBps) / 10000);
  }

  release(sender: string) {
    if (this.status !== 0) throw new Error('finalized');
    if (!this.expired()) {
      if (sender !== this.buyer) throw new Error('not allowed');
    } else {
      if (sender !== this.buyer && sender !== this.seller) throw new Error('not allowed');
    }
    const fee = this.feeAmount();
    if (fee > 0) this.transfers.push({ to: this.feeRecipient, amount: fee });
    this.transfers.push({ to: this.seller, amount: this.amount - fee });
    this.status = 1;
  }

  refund(sender: string) {
    if (this.status !== 0) throw new Error('finalized');
    if (!this.expired()) {
      if (sender !== this.seller) throw new Error('not allowed');
    } else {
      if (sender !== this.buyer && sender !== this.seller) throw new Error('not allowed');
    }
    this.transfers.push({ to: this.buyer, amount: this.amount });
    this.status = 2;
  }

  adminResolve(sender: string, toSeller: boolean) {
    if (this.status !== 0) throw new Error('finalized');
    if (sender !== this.admin) throw new Error('not admin');
    if (toSeller) {
      const fee = this.feeAmount();
      if (fee > 0) this.transfers.push({ to: this.feeRecipient, amount: fee });
      this.transfers.push({ to: this.seller, amount: this.amount - fee });
      this.status = 1;
    } else {
      this.transfers.push({ to: this.buyer, amount: this.amount });
      this.status = 2;
    }
  }
}

describe('EscrowSim', () => {
  const buyer = 'buyer';
  const seller = 'seller';
  const admin = 'admin';
  const feeRecipient = 'fee';
  const amount = 100;
  const dispute = 10;
  const feeBps = 200; // 2%

  test('buyer releases before timeout with fee', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute, feeBps, feeRecipient);
    e.release(buyer);
    expect(e.status).toBe(1);
    expect(e.transfers).toEqual([
      { to: feeRecipient, amount: 2 },
      { to: seller, amount: 98 },
    ]);
  });

  test('seller cannot release before timeout', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute, feeBps, feeRecipient);
    expect(() => e.release(seller)).toThrow();
    expect(e.status).toBe(0);
  });

  test('seller refunds before timeout without fee', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute, feeBps, feeRecipient);
    e.refund(seller);
    expect(e.status).toBe(2);
    expect(e.transfers).toEqual([{ to: buyer, amount: 100 }]);
  });

  test('buyer cannot refund before timeout', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute, feeBps, feeRecipient);
    expect(() => e.refund(buyer)).toThrow();
  });

  test('seller releases after timeout with fee', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute, feeBps, feeRecipient);
    e.advance(dispute + 1);
    e.release(seller);
    expect(e.status).toBe(1);
    expect(e.transfers).toEqual([
      { to: feeRecipient, amount: 2 },
      { to: seller, amount: 98 },
    ]);
  });

  test('buyer refunds after timeout', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute, feeBps, feeRecipient);
    e.advance(dispute + 1);
    e.refund(buyer);
    expect(e.status).toBe(2);
    expect(e.transfers).toEqual([{ to: buyer, amount: 100 }]);
  });

  test('admin resolves to seller with fee', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute, feeBps, feeRecipient);
    e.adminResolve(admin, true);
    expect(e.status).toBe(1);
    expect(e.transfers).toEqual([
      { to: feeRecipient, amount: 2 },
      { to: seller, amount: 98 },
    ]);
  });

  test('admin resolves to buyer', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute, feeBps, feeRecipient);
    e.adminResolve(admin, false);
    expect(e.status).toBe(2);
    expect(e.transfers).toEqual([{ to: buyer, amount: 100 }]);
  });

  test('unauthorized admin resolve rejected', () => {
    const e = new EscrowSim(buyer, seller, admin, amount, dispute, feeBps, feeRecipient);
    expect(() => e.adminResolve('other', true)).toThrow();
  });
});

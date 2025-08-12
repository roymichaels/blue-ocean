import "@tact-lang/core";

message Pay {
    amount: Int;
}

message Release {}
message Refund {}

contract OrderPayment {
    owner: Address;
    seller: Address;
    buyer: Address;
    amount: Int;
    paid: Bool;
    feeAddress: Address;
    feeBps: Int;

    init(owner: Address, seller: Address, buyer: Address, amount: Int, feeAddress: Address, feeBps: Int) {
        self.owner = owner;
        self.seller = seller;
        self.buyer = buyer;
        self.amount = amount;
        self.paid = false;
        self.feeAddress = feeAddress;
        self.feeBps = feeBps;
    }

    receive(msg: Pay) {
        require(sender() == self.buyer, 101);
        require(!self.paid, 102);
        require(msg.amount >= self.amount, 103);
        accept();
        self.paid = true;
    }

    receive(msg: Release) {
        require(sender() == self.owner, 104);
        require(self.paid, 105);
        let fee = (self.amount * self.feeBps) / 10000;
        send(self.feeAddress, fee);
        send(self.seller, self.amount - fee);
    }

    receive(msg: Refund) {
        require(sender() == self.owner, 106);
        require(self.paid, 107);
        send(self.buyer, balance());
        self.paid = false;
    }
}

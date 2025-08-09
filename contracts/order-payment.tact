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

    init(owner: Address, seller: Address, buyer: Address, amount: Int) {
        self.owner = owner;
        self.seller = seller;
        self.buyer = buyer;
        self.amount = amount;
        self.paid = false;
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
        send(self.seller, self.amount);
    }

    receive(msg: Refund) {
        require(sender() == self.owner, 106);
        require(self.paid, 107);
        send(self.buyer, balance());
        self.paid = false;
    }
}

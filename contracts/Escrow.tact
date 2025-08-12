import "@tact-lang/core";
import "./Settings.tact";

message Release {}
message Refund {}
message AdminResolve {
    toSeller: Bool;
}

contract Escrow {
    buyer: Address;
    seller: Address;
    admin: Address;
    amount: Int;
    disputeWindow: Int;
    createdAt: Int;
    status: Int; // 0 pending, 1 released, 2 refunded
    settings: Address;

    init(buyer: Address, seller: Address, amount: Int, disputeWindow: Int, settings: Address) {
        self.buyer = buyer;
        self.seller = seller;
        self.amount = amount;
        self.disputeWindow = disputeWindow;
        self.admin = sender();
        self.createdAt = now();
        self.status = 0;
        self.settings = settings;
    }

    private isExpired(): Bool {
        return now() >= self.createdAt + self.disputeWindow;
    }

    receive(msg: Release) {
        require(self.status == 0, 100);
        if (!self.isExpired()) {
            require(sender() == self.buyer, 101);
        } else {
            require(sender() == self.buyer || sender() == self.seller, 102);
        }
        let feeBps = Settings(self.settings).feeBps();
        let feeRecipient = Settings(self.settings).admin();
        let fee = (self.amount * feeBps) / 10000;
        if (fee > 0) {
            send(feeRecipient, fee);
        }
        send(self.seller, self.amount - fee);
        self.status = 1;
    }

    receive(msg: Refund) {
        require(self.status == 0, 103);
        if (!self.isExpired()) {
            require(sender() == self.seller, 104);
        } else {
            require(sender() == self.buyer || sender() == self.seller, 105);
        }
        send(self.buyer, balance());
        self.status = 2;
    }

    receive(msg: AdminResolve) {
        require(self.status == 0, 106);
        require(sender() == self.admin, 107);
        if (msg.toSeller) {
            let feeBps = Settings(self.settings).feeBps();
            let feeRecipient = Settings(self.settings).admin();
            let fee = (self.amount * feeBps) / 10000;
            if (fee > 0) {
                send(feeRecipient, fee);
            }
            send(self.seller, self.amount - fee);
            self.status = 1;
        } else {
            send(self.buyer, balance());
            self.status = 2;
        }
    }
}

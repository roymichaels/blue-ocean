import "@tact-lang/core";
import "./Escrow.tact";

message CreateEscrow {
    buyer: Address;
    seller: Address;
    amount: Int;
    disputeWindow: Int;
}

contract EscrowFactory {
    receive(msg: CreateEscrow) {
        let init = initOf Escrow(msg.buyer, msg.seller, msg.amount, msg.disputeWindow);
        let addr = contractAddress(init);
        send(addr, msg.amount, null, 0, init);
    }
}

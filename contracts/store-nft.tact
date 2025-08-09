import "@tact-lang/core";

message Transfer {
    to: Address;
}

contract StoreNFT {
    owner: Address;
    name: String;

    init(owner: Address, name: String) {
        self.owner = owner;
        self.name = name;
    }

    receive(msg: Transfer) {
        require(sender() == self.owner, 101);
        self.owner = msg.to;
    }

    getOwner(): Address {
        return self.owner;
    }

    getMetadata(): (String, Address) {
        return (self.name, self.owner);
    }
}

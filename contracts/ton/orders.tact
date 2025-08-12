// Details stored for each order on-chain
struct OrderData {
  // Address of the deployed escrow/payment contract
  address escrowAddr;
  // Hash of all items in the order
  slice itemsHash;
  // Encrypted shipping address blob
  cell shipAddrEnc;
}

contract Orders {
  address owner;
  map<int, OrderData> data;

  init(owner: address) {
    self.owner = owner;
  }

  receive("set", key: int, value: OrderData) {
    require(sender == self.owner, "only owner");
    self.data.set(key, value);
  }

  get fun get(key: int): OrderData? {
    return self.data.get(key);
  }
}

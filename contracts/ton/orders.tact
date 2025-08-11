struct OrderData {
  address escrowAddr;
  slice itemsHash;
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

contract Stores {
  address owner;
  map<int, cell> data;

  init(owner: address) {
    self.owner = owner;
  }

  receive("set", key: int, value: cell) {
    require(sender == self.owner, "only owner");
    self.data.set(key, value);
  }

  get fun get(key: int): cell? {
    return self.data.get(key);
  }
}

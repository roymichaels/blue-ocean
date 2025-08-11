contract Reviews {
  address owner;
  map<int, cell> data;

  init(owner: address) {
    self.owner = owner;
  }

  receive("set", key: int, value: cell) {
    require(sender == self.owner, "only owner");
    if (value.slice_bits() == 0) {
      self.data.del(key);
    } else {
      self.data.set(key, value);
    }
  }

  get fun get(key: int): cell? {
    return self.data.get(key);
  }

  get fun list(): map<int, cell> {
    return self.data;
  }
}

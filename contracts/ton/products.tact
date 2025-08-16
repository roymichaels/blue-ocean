contract Products {
  address owner;
  int version;
  map<int, cell> data;

  init(owner: address) {
    self.owner = owner;
    self.version = 0;
  }

  receive("set", key: int, value: cell) {
    require(sender == self.owner, "only owner");
    self.data.set(key, value);
    self.version = self.version + 1;
  }

  receive("set_batch", items: map<int, cell>) {
    require(sender == self.owner, "only owner");
    var it = items.iterator();
    while (it.next()) {
      self.data.set(it.key(), it.value());
    }
    self.version = self.version + 1;
  }

  get fun get(key: int): cell? {
    return self.data.get(key);
  }

  get fun getVersion(): int {
    return self.version;
  }
}

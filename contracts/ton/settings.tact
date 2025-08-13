contract Settings {
  address owner;
  map<int, cell> data;
  int feeBps;
  string[] admins;

  init(owner: address, feeBps: int, admins: string[]) {
    self.owner = owner;
    self.feeBps = feeBps;
    self.admins = admins;
  }

  receive("set", key: int, value: cell) {
    require(sender == self.owner, "only owner");
    self.data.set(key, value);
  }

  receive("set_fee_bps", value: int) {
    require(sender == self.owner, "only owner");
    self.feeBps = value;
    emit("FeeBpsChanged".asComment());
  }

  receive("set_admins", admins: string[]) {
    require(sender == self.owner, "only owner");
    self.admins = admins;
    emit("AdminsChanged".asComment());
  }

  get fun get(key: int): cell? {
    return self.data.get(key);
  }

  get fun get_fee_bps(): int {
    return self.feeBps;
  }

  get fun get_admins(): string[] {
    return self.admins;
  }
}

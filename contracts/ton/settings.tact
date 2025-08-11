contract Settings {
  address owner;
  map<int, cell> data;
  string[] admins;

  init(owner: address, admins: string[]) {
    self.owner = owner;
    self.admins = admins;
  }

  receive("set", key: int, value: cell) {
    require(sender == self.owner, "only owner");
    self.data.set(key, value);
  }

  receive("set_admins", admins: string[]) {
    require(sender == self.owner, "only owner");
    self.admins = admins;
  }

  get fun get(key: int): cell? {
    return self.data.get(key);
  }

  get fun get_admins(): string[] {
    return self.admins;
  }
}

message SetFeeBps { value: Int; }
message SetBrand { value: String; }
message SetMoonpayKey { value: String; }
message SetEscrowPolicy { value: String; }

contract Settings {
    admin: Address;
    feeBps: Int;
    brand: String;
    moonpayKey: String;
    escrowPolicy: String;

    init(admin: Address, feeBps: Int, brand: String, moonpayKey: String, escrowPolicy: String) {
        self.admin = admin;
        self.feeBps = feeBps;
        self.brand = brand;
        self.moonpayKey = moonpayKey;
        self.escrowPolicy = escrowPolicy;
    }

    receive(msg: SetFeeBps) {
        require(sender() == self.admin, "not admin");
        self.feeBps = msg.value;
        emit("FeeBpsChanged".asComment());
    }

    receive(msg: SetBrand) {
        require(sender() == self.admin, "not admin");
        self.brand = msg.value;
        emit("BrandChanged".asComment());
    }

    receive(msg: SetMoonpayKey) {
        require(sender() == self.admin, "not admin");
        self.moonpayKey = msg.value;
        emit("MoonpayKeyChanged".asComment());
    }

    receive(msg: SetEscrowPolicy) {
        require(sender() == self.admin, "not admin");
        self.escrowPolicy = msg.value;
        emit("EscrowPolicyChanged".asComment());
    }

    get fun feeBps(): Int {
        return self.feeBps;
    }

    get fun brand(): String {
        return self.brand;
    }

    get fun moonpayKey(): String {
        return self.moonpayKey;
    }

    get fun escrowPolicy(): String {
        return self.escrowPolicy;
    }
}

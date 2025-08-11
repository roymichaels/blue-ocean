import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type SetFeeBps = {
    $$type: 'SetFeeBps';
    value: bigint;
}

export function storeSetFeeBps(src: SetFeeBps) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3100305635, 32);
        b_0.storeInt(src.value, 257);
    };
}

export function loadSetFeeBps(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3100305635) { throw Error('Invalid prefix'); }
    const _value = sc_0.loadIntBig(257);
    return { $$type: 'SetFeeBps' as const, value: _value };
}

export function loadTupleSetFeeBps(source: TupleReader) {
    const _value = source.readBigNumber();
    return { $$type: 'SetFeeBps' as const, value: _value };
}

export function loadGetterTupleSetFeeBps(source: TupleReader) {
    const _value = source.readBigNumber();
    return { $$type: 'SetFeeBps' as const, value: _value };
}

export function storeTupleSetFeeBps(source: SetFeeBps) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.value);
    return builder.build();
}

export function dictValueParserSetFeeBps(): DictionaryValue<SetFeeBps> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSetFeeBps(src)).endCell());
        },
        parse: (src) => {
            return loadSetFeeBps(src.loadRef().beginParse());
        }
    }
}

export type SetBrand = {
    $$type: 'SetBrand';
    value: string;
}

export function storeSetBrand(src: SetBrand) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2495006186, 32);
        b_0.storeStringRefTail(src.value);
    };
}

export function loadSetBrand(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2495006186) { throw Error('Invalid prefix'); }
    const _value = sc_0.loadStringRefTail();
    return { $$type: 'SetBrand' as const, value: _value };
}

export function loadTupleSetBrand(source: TupleReader) {
    const _value = source.readString();
    return { $$type: 'SetBrand' as const, value: _value };
}

export function loadGetterTupleSetBrand(source: TupleReader) {
    const _value = source.readString();
    return { $$type: 'SetBrand' as const, value: _value };
}

export function storeTupleSetBrand(source: SetBrand) {
    const builder = new TupleBuilder();
    builder.writeString(source.value);
    return builder.build();
}

export function dictValueParserSetBrand(): DictionaryValue<SetBrand> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSetBrand(src)).endCell());
        },
        parse: (src) => {
            return loadSetBrand(src.loadRef().beginParse());
        }
    }
}

export type SetMoonpayKey = {
    $$type: 'SetMoonpayKey';
    value: string;
}

export function storeSetMoonpayKey(src: SetMoonpayKey) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3255290514, 32);
        b_0.storeStringRefTail(src.value);
    };
}

export function loadSetMoonpayKey(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3255290514) { throw Error('Invalid prefix'); }
    const _value = sc_0.loadStringRefTail();
    return { $$type: 'SetMoonpayKey' as const, value: _value };
}

export function loadTupleSetMoonpayKey(source: TupleReader) {
    const _value = source.readString();
    return { $$type: 'SetMoonpayKey' as const, value: _value };
}

export function loadGetterTupleSetMoonpayKey(source: TupleReader) {
    const _value = source.readString();
    return { $$type: 'SetMoonpayKey' as const, value: _value };
}

export function storeTupleSetMoonpayKey(source: SetMoonpayKey) {
    const builder = new TupleBuilder();
    builder.writeString(source.value);
    return builder.build();
}

export function dictValueParserSetMoonpayKey(): DictionaryValue<SetMoonpayKey> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSetMoonpayKey(src)).endCell());
        },
        parse: (src) => {
            return loadSetMoonpayKey(src.loadRef().beginParse());
        }
    }
}

export type SetEscrowPolicy = {
    $$type: 'SetEscrowPolicy';
    value: string;
}

export function storeSetEscrowPolicy(src: SetEscrowPolicy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1614866497, 32);
        b_0.storeStringRefTail(src.value);
    };
}

export function loadSetEscrowPolicy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1614866497) { throw Error('Invalid prefix'); }
    const _value = sc_0.loadStringRefTail();
    return { $$type: 'SetEscrowPolicy' as const, value: _value };
}

export function loadTupleSetEscrowPolicy(source: TupleReader) {
    const _value = source.readString();
    return { $$type: 'SetEscrowPolicy' as const, value: _value };
}

export function loadGetterTupleSetEscrowPolicy(source: TupleReader) {
    const _value = source.readString();
    return { $$type: 'SetEscrowPolicy' as const, value: _value };
}

export function storeTupleSetEscrowPolicy(source: SetEscrowPolicy) {
    const builder = new TupleBuilder();
    builder.writeString(source.value);
    return builder.build();
}

export function dictValueParserSetEscrowPolicy(): DictionaryValue<SetEscrowPolicy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSetEscrowPolicy(src)).endCell());
        },
        parse: (src) => {
            return loadSetEscrowPolicy(src.loadRef().beginParse());
        }
    }
}

export type Settings$Data = {
    $$type: 'Settings$Data';
    admin: Address;
    feeBps: bigint;
    brand: string;
    moonpayKey: string;
    escrowPolicy: string;
}

export function storeSettings$Data(src: Settings$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.admin);
        b_0.storeInt(src.feeBps, 257);
        b_0.storeStringRefTail(src.brand);
        b_0.storeStringRefTail(src.moonpayKey);
        b_0.storeStringRefTail(src.escrowPolicy);
    };
}

export function loadSettings$Data(slice: Slice) {
    const sc_0 = slice;
    const _admin = sc_0.loadAddress();
    const _feeBps = sc_0.loadIntBig(257);
    const _brand = sc_0.loadStringRefTail();
    const _moonpayKey = sc_0.loadStringRefTail();
    const _escrowPolicy = sc_0.loadStringRefTail();
    return { $$type: 'Settings$Data' as const, admin: _admin, feeBps: _feeBps, brand: _brand, moonpayKey: _moonpayKey, escrowPolicy: _escrowPolicy };
}

export function loadTupleSettings$Data(source: TupleReader) {
    const _admin = source.readAddress();
    const _feeBps = source.readBigNumber();
    const _brand = source.readString();
    const _moonpayKey = source.readString();
    const _escrowPolicy = source.readString();
    return { $$type: 'Settings$Data' as const, admin: _admin, feeBps: _feeBps, brand: _brand, moonpayKey: _moonpayKey, escrowPolicy: _escrowPolicy };
}

export function loadGetterTupleSettings$Data(source: TupleReader) {
    const _admin = source.readAddress();
    const _feeBps = source.readBigNumber();
    const _brand = source.readString();
    const _moonpayKey = source.readString();
    const _escrowPolicy = source.readString();
    return { $$type: 'Settings$Data' as const, admin: _admin, feeBps: _feeBps, brand: _brand, moonpayKey: _moonpayKey, escrowPolicy: _escrowPolicy };
}

export function storeTupleSettings$Data(source: Settings$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.admin);
    builder.writeNumber(source.feeBps);
    builder.writeString(source.brand);
    builder.writeString(source.moonpayKey);
    builder.writeString(source.escrowPolicy);
    return builder.build();
}

export function dictValueParserSettings$Data(): DictionaryValue<Settings$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSettings$Data(src)).endCell());
        },
        parse: (src) => {
            return loadSettings$Data(src.loadRef().beginParse());
        }
    }
}

 type Settings_init_args = {
    $$type: 'Settings_init_args';
    admin: Address;
    feeBps: bigint;
    brand: string;
    moonpayKey: string;
    escrowPolicy: string;
}

function initSettings_init_args(src: Settings_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.admin);
        b_0.storeInt(src.feeBps, 257);
        b_0.storeStringRefTail(src.brand);
        const b_1 = new Builder();
        b_1.storeStringRefTail(src.moonpayKey);
        b_1.storeStringRefTail(src.escrowPolicy);
        b_0.storeRef(b_1.endCell());
    };
}

async function Settings_init(admin: Address, feeBps: bigint, brand: string, moonpayKey: string, escrowPolicy: string) {
    const __code = Cell.fromHex('b5ee9c72410215010003b5000228ff008e88f4a413f4bcf2c80bed5320e303ed43d9010c02027102070201200305019bbb885ed44d0d200018e1dfa40810101d700d401d001d401d0d401d001d430d01025102410236c158e1ffa40810101d700d401d001d401d0d401d001d430d010251024102305d15503e2db3c6c51804000223019bb9a1eed44d0d200018e1dfa40810101d700d401d001d401d0d401d001d430d01025102410236c158e1ffa40810101d700d401d001d401d0d401d001d430d010251024102305d15503e2db3c6c51806000222020120080a019bb8e7eed44d0d200018e1dfa40810101d700d401d001d401d0d401d001d430d01025102410236c158e1ffa40810101d700d401d001d401d0d401d001d430d010251024102305d15503e2db3c6c51809000220019bb879bed44d0d200018e1dfa40810101d700d401d001d401d0d401d001d430d01025102410236c158e1ffa40810101d700d401d001d401d0d401d001d430d010251024102305d15503e2db3c6c5180b00022102f83001d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018e1dfa40810101d700d401d001d401d0d401d001d430d01025102410236c158e1ffa40810101d700d401d001d401d0d401d001d430d010251024102305d15503e206925f06e004d70d1ff2e082218210b8cae8e3bae30221821094b6c5ea0d0f01a6316c12810101d700308200b93ef84224c705f2f488c88258c000000000000000000000000101cb67ccc970fb00443302c87f01ca0055405045ce12810101cf0001c8cecdc802c8ce12cd02c8ce12cdcdc9ed540e0022000000004665654270734368616e67656403d6ba8ece6c21d430d08200b93ef84224c705f2f488c88258c000000000000000000000000101cb67ccc970fb004034c87f01ca0055405045ce12810101cf0001c8cecdc802c8ce12cd02c8ce12cdcdc9ed54e0218210c207ca92bae3023682106040e841bae3025f05f2c0821011130020000000004272616e644368616e67656401a0313403d430d08200b93ef84224c705f2f488c88258c000000000000000000000000101cb67ccc970fb00440302c87f01ca0055405045ce12810101cf0001c8cecdc802c8ce12cd02c8ce12cdcdc9ed5412002a000000004d6f6f6e7061794b65794368616e676564019a04d430d08200b93ef84224c705f2f488c88258c000000000000000000000000101cb67ccc970fb004430c87f01ca0055405045ce12810101cf0001c8cecdc802c8ce12cd02c8ce12cdcdc9ed5414002e00000000457363726f77506f6c6963794368616e676564e338883c');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initSettings_init_args({ $$type: 'Settings_init_args', admin, feeBps, brand, moonpayKey, escrowPolicy })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const Settings_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
    47422: { message: "not admin" },
} as const

export const Settings_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
    "not admin": 47422,
} as const

const Settings_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"SetFeeBps","header":3100305635,"fields":[{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SetBrand","header":2495006186,"fields":[{"name":"value","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"SetMoonpayKey","header":3255290514,"fields":[{"name":"value","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"SetEscrowPolicy","header":1614866497,"fields":[{"name":"value","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"Settings$Data","header":null,"fields":[{"name":"admin","type":{"kind":"simple","type":"address","optional":false}},{"name":"feeBps","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"brand","type":{"kind":"simple","type":"string","optional":false}},{"name":"moonpayKey","type":{"kind":"simple","type":"string","optional":false}},{"name":"escrowPolicy","type":{"kind":"simple","type":"string","optional":false}}]},
]

const Settings_opcodes = {
    "SetFeeBps": 3100305635,
    "SetBrand": 2495006186,
    "SetMoonpayKey": 3255290514,
    "SetEscrowPolicy": 1614866497,
}

const Settings_getters: ABIGetter[] = [
    {"name":"feeBps","methodId":80005,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"brand","methodId":88606,"arguments":[],"returnType":{"kind":"simple","type":"string","optional":false}},
    {"name":"moonpayKey","methodId":116635,"arguments":[],"returnType":{"kind":"simple","type":"string","optional":false}},
    {"name":"escrowPolicy","methodId":102014,"arguments":[],"returnType":{"kind":"simple","type":"string","optional":false}},
]

export const Settings_getterMapping: { [key: string]: string } = {
    'feeBps': 'getFeeBps',
    'brand': 'getBrand',
    'moonpayKey': 'getMoonpayKey',
    'escrowPolicy': 'getEscrowPolicy',
}

const Settings_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"SetFeeBps"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SetBrand"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SetMoonpayKey"}},
    {"receiver":"internal","message":{"kind":"typed","type":"SetEscrowPolicy"}},
]


export class Settings implements Contract {
    
    public static readonly storageReserve = 0n;
    public static readonly errors = Settings_errors_backward;
    public static readonly opcodes = Settings_opcodes;
    
    static async init(admin: Address, feeBps: bigint, brand: string, moonpayKey: string, escrowPolicy: string) {
        return await Settings_init(admin, feeBps, brand, moonpayKey, escrowPolicy);
    }
    
    static async fromInit(admin: Address, feeBps: bigint, brand: string, moonpayKey: string, escrowPolicy: string) {
        const __gen_init = await Settings_init(admin, feeBps, brand, moonpayKey, escrowPolicy);
        const address = contractAddress(0, __gen_init);
        return new Settings(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new Settings(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  Settings_types,
        getters: Settings_getters,
        receivers: Settings_receivers,
        errors: Settings_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: SetFeeBps | SetBrand | SetMoonpayKey | SetEscrowPolicy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SetFeeBps') {
            body = beginCell().store(storeSetFeeBps(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SetBrand') {
            body = beginCell().store(storeSetBrand(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SetMoonpayKey') {
            body = beginCell().store(storeSetMoonpayKey(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SetEscrowPolicy') {
            body = beginCell().store(storeSetEscrowPolicy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getFeeBps(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('feeBps', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
    async getBrand(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('brand', builder.build())).stack;
        const result = source.readString();
        return result;
    }
    
    async getMoonpayKey(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('moonpayKey', builder.build())).stack;
        const result = source.readString();
        return result;
    }
    
    async getEscrowPolicy(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('escrowPolicy', builder.build())).stack;
        const result = source.readString();
        return result;
    }
    
}
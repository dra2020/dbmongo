import * as MDB from 'mongodb';
import * as Context from '@dra2020/context';
import * as LogAbstract from '@dra2020/logabstract';
import * as Storage from '@dra2020/storage';
import * as FSM from '@dra2020/fsm';
import * as DB from '@dra2020/dbabstract';
export interface DBMongoEnvironment {
    context: Context.IContext;
    log: LogAbstract.ILog;
    fsmManager: FSM.FsmManager;
    storageManager: Storage.StorageManager;
}
declare class FsmAPIWatch extends FSM.Fsm {
    constructor(env: DBMongoEnvironment);
    get env(): DBMongoEnvironment;
    tick(): void;
}
export declare function create(env: DBMongoEnvironment): DB.DBClient;
export declare class MongoClient extends DB.DBClient {
    mdbclient: MDB.MongoClient;
    serializerUpdate: FSM.FsmSerializer;
    fsmAPIWatch: FsmAPIWatch;
    constructor(env: DBMongoEnvironment);
    get env(): DBMongoEnvironment;
    get Production(): boolean;
    get InstanceUrl(): string;
    get DBName(): string;
    get UserName(): string;
    get Password(): string;
    get mongoErrorFrequency(): number;
    createCollection(name: string, options: any): DB.DBCollection;
    createStream(col: MongoCollection): FSM.FsmArray;
    closeStream(col: MongoCollection): void;
    createUpdate(col: MongoCollection, query: any, values: any): DB.DBUpdate;
    createUnset(col: MongoCollection, query: any, values: any): DB.DBUnset;
    createDelete(col: MongoCollection, query: any): DB.DBDelete;
    createFind(col: MongoCollection, filter: any): DB.DBFind;
    createQuery(col: MongoCollection, filter: any): DB.DBQuery;
    createIndex(col: MongoCollection, uid: string): DB.DBIndex;
    createClose(): DB.DBClose;
    forceError(): boolean;
    tick(): void;
}
export declare class MongoCollection extends DB.DBCollection {
    fsmStream: FSM.FsmArray;
    constructor(env: DBMongoEnvironment, client: MongoClient, name: string, options: any);
    get env(): DBMongoEnvironment;
    createStream(): FSM.FsmArray;
    closeStream(): void;
    addToStream(o: any): void;
    mdbclient(): MDB.MongoClient;
    forceError(): boolean;
    tick(): void;
}
export declare class MongoUpdate extends DB.DBUpdate {
    trace: LogAbstract.AsyncTimer;
    constructor(env: DBMongoEnvironment, col: MongoCollection, query: any, values: any);
    get env(): DBMongoEnvironment;
    get mcol(): MongoCollection;
    forceError(): boolean;
    tick(): void;
}
export declare class MongoUnset extends DB.DBUnset {
    trace: LogAbstract.AsyncTimer;
    constructor(env: DBMongoEnvironment, col: MongoCollection, query: any, values: any);
    get env(): DBMongoEnvironment;
    get mcol(): MongoCollection;
    forceError(): boolean;
    tick(): void;
}
export declare class MongoDelete extends DB.DBDelete {
    trace: LogAbstract.AsyncTimer;
    constructor(env: DBMongoEnvironment, col: MongoCollection, query: any);
    get env(): DBMongoEnvironment;
    forceError(): boolean;
    tick(): void;
}
export declare class MongoFind extends DB.DBFind {
    trace: LogAbstract.AsyncTimer;
    prevFind: MongoFind;
    constructor(env: DBMongoEnvironment, col: MongoCollection, filter: any);
    get env(): DBMongoEnvironment;
    forceError(): boolean;
    tick(): void;
}
export declare class MongoQuery extends DB.DBQuery {
    cursor: MDB.Cursor;
    trace: LogAbstract.AsyncTimer;
    bError: boolean;
    constructor(env: DBMongoEnvironment, col: MongoCollection, filter: any);
    get env(): DBMongoEnvironment;
    forceError(): boolean;
    tick(): void;
}
export declare class MongoIndex extends DB.DBIndex {
    trace: LogAbstract.AsyncTimer;
    constructor(env: DBMongoEnvironment, col: MongoCollection, uid: string);
    get env(): DBMongoEnvironment;
    tick(): void;
}
export declare class MongoClose extends DB.DBClose {
    constructor(env: DBMongoEnvironment, client: MongoClient);
}
export {};

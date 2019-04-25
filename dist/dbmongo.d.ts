import * as MDB from 'mongodb';
import * as Log from '@terrencecrowley/log';
import * as Storage from '@terrencecrowley/storage';
import * as FSM from '@terrencecrowley/fsm';
import * as DB from '@terrencecrowley/dbabstract';
export declare class MongoClient extends DB.DBClient {
    mdbclient: MDB.MongoClient;
    serializerUpdate: FSM.FsmSerializer;
    constructor(storageManager: Storage.StorageManager);
    createCollection(name: string, options: any): DB.DBCollection;
    createUpdate(col: MongoCollection, query: any, values: any): DB.DBUpdate;
    createDelete(col: MongoCollection, query: any): DB.DBDelete;
    createFind(col: MongoCollection, filter: any): DB.DBFind;
    createQuery(col: MongoCollection, filter: any): DB.DBQuery;
    createIndex(col: MongoCollection, uid: string): DB.DBIndex;
    createClose(): DB.DBClose;
    forceError(): boolean;
    tick(): void;
}
export declare class MongoCollection extends DB.DBCollection {
    constructor(typeName: string, client: MongoClient, name: string, options: any);
    mdbclient(): MDB.MongoClient;
    forceError(): boolean;
    tick(): void;
}
export declare class MongoUpdate extends DB.DBUpdate {
    trace: Log.AsyncTimer;
    constructor(typeName: string, col: MongoCollection, query: any, values: any);
    forceError(): boolean;
    tick(): void;
}
export declare class MongoDelete extends DB.DBDelete {
    trace: Log.AsyncTimer;
    constructor(typeName: string, col: MongoCollection, query: any);
    forceError(): boolean;
    tick(): void;
}
export declare class MongoFind extends DB.DBFind {
    trace: Log.AsyncTimer;
    prevFind: MongoFind;
    constructor(typeName: string, col: MongoCollection, filter: any);
    forceError(): boolean;
    tick(): void;
}
export declare class MongoQuery extends DB.DBQuery {
    cursor: MDB.Cursor;
    trace: Log.AsyncTimer;
    constructor(typeName: string, col: MongoCollection, filter: any);
    forceError(): boolean;
    tick(): void;
}
export declare class MongoIndex extends DB.DBIndex {
    trace: Log.AsyncTimer;
    constructor(typeName: string, col: MongoCollection, uid: string);
    tick(): void;
}
export declare class MongoClose extends DB.DBClose {
    constructor(typeName: string, client: MongoClient);
}

// Node
import * as fs from 'fs';

// Public mongodb API
import * as MDB from 'mongodb';

// Shared libraries
import * as Util from '@dra2020/util';
import * as Context from '@dra2020/context';
import * as LogAbstract from '@dra2020/logabstract';
import * as Storage from '@dra2020/storage';
import * as FSM from '@dra2020/fsm';
import * as DB from '@dra2020/dbabstract';

export interface DBMongoEnvironment
{
  context: Context.IContext;
  log: LogAbstract.ILog;
  fsmManager: FSM.FsmManager;
  storageManager: Storage.StorageManager;
}

const DBMongoContextDefaults: Context.ContextValues =
{
  aws_mongodb_uri: '',
  aws_mongodb_username: '',
  aws_mongodb_password: '',
  mongo_error_frequency: 0,
}


function readPem(): string[]
{
  return [ fs.readFileSync('rds-combined-ca-bundle.pem', 'utf8') ];
}

function toDBInternal(o: any): any
{
  if (o && o.id !== undefined)
  {
    o = Util.shallowCopy(o);
    o._id = o.id;
    delete o.id;
  }
  return o;
}

function toDBExternal(o: any): any
{
  if (o && o._id !== undefined)
  {
    o = Util.shallowCopy(o);
    o.id = o._id;
    delete o._id;
  }
  return o;
}

class FsmAPIWatch extends FSM.Fsm
{
  constructor(env: DBMongoEnvironment)
  {
    super(env);
  }

  get env(): DBMongoEnvironment { return this._env as DBMongoEnvironment }

  tick(): void
  {
    this.env.log.value({ event: 'mongodb: APIs outstanding', value: this.nWaitOn });
  }
}

export function create(env: DBMongoEnvironment): DB.DBClient { return new MongoClient(env) }

export class MongoClient extends DB.DBClient
{
  mdbclient: MDB.MongoClient;
  serializerUpdate: FSM.FsmSerializer;
  fsmAPIWatch: FsmAPIWatch;

  constructor(env: DBMongoEnvironment)
  {
    super(env);
    env.context.setDefaults(DBMongoContextDefaults);
    this.mdbclient = null;
    this.serializerUpdate = new FSM.FsmSerializer(env);
    this.fsmAPIWatch = new FsmAPIWatch(env);
  }

  get env(): DBMongoEnvironment { return this._env as DBMongoEnvironment; }

  get Production(): boolean { return this.env.context.xflag('production'); }
  get InstanceUrl(): string { return `${this.env.context.xstring('aws_mongodb_uri')}/${this.DBName}`; }
  get DBName(): string { return this.Production ? 'prod' : 'dev'; }
  get UserName(): string { return this.env.context.xstring('aws_mongodb_username'); }
  get Password(): string { return this.env.context.xstring('aws_mongodb_password'); }
  get mongoErrorFrequency(): number { return this.env.context.xnumber('mongo_error_frequency'); }

  createCollection(name: string, options: any): DB.DBCollection
  {  
    let col = new MongoCollection(this.env, this, name, options);
    this.fsmAPIWatch.waitOn(col);
    return col;
  }

  createStream(col: MongoCollection): FSM.FsmArray
  {
    return col.createStream();
  }

  closeStream(col: MongoCollection): void
  {
    col.closeStream();
  }

  createUpdate(col: MongoCollection, query: any, values: any): DB.DBUpdate
  {
    let update = new MongoUpdate(this.env, col, query, values);
    if (query && query.id)
      this.serializerUpdate.serialize(query.id, update);
    this.fsmAPIWatch.waitOn(update);
    return update;
  }

  createUnset(col: MongoCollection, query: any, values: any): DB.DBUnset
  {
    let unset = new MongoUnset(this.env, col, query, values);
    if (query && query.id)
      this.serializerUpdate.serialize(query.id, unset);
    this.fsmAPIWatch.waitOn(unset);
    return unset;
  }

  createDelete(col: MongoCollection, query: any): DB.DBDelete
  {
    let del = new MongoDelete(this.env, col, query);
    this.fsmAPIWatch.waitOn(del);
    return del;
  }

  createFind(col: MongoCollection, filter: any): DB.DBFind
  {
    let find = new MongoFind(this.env, col, filter);
    this.fsmAPIWatch.waitOn(find);
    return find;
  }

  createQuery(col: MongoCollection, filter: any): DB.DBQuery
  {
    let query = new MongoQuery(this.env, col, filter);
    this.fsmAPIWatch.waitOn(query);
    return query;
  }

  createIndex(col: MongoCollection, uid: string): DB.DBIndex
  {
    let index = new MongoIndex(this.env, col, uid);
    this.fsmAPIWatch.waitOn(index);
    return index;
  }

  createClose(): DB.DBClose
  {
    let dbclose = new MongoClose(this.env, this);
    this.fsmAPIWatch.waitOn(dbclose);
    return dbclose;
  }

  forceError(): boolean
  {
    if (!this.Production && (Math.random() < this.mongoErrorFrequency))
      return true;
    return false;
  }

  tick(): void
  {
    if (this.ready && this.state == FSM.FSM_STARTING)
    {
      this.setState(FSM.FSM_PENDING);

      let sslCA = readPem();
      let mdbOptions = {
        auth: { user: this.UserName, password: this.Password },
        ssl: true,
        sslCA: sslCA,
        useNewUrlParser: true,
        //useUnifiedTopology: true,
        };
      let localClient = new MDB.MongoClient(this.InstanceUrl, mdbOptions);
      this.env.log.event({ event: 'mongodb: connecting to database', detail:  this.InstanceUrl });

      localClient.connect((err: MDB.MongoError, client: MDB.MongoClient) => {
          if (this.done)
            return;
          else if (err)
          {
            this.setState(FSM.FSM_ERROR);
            this.env.log.error({ event: 'client connection failed', detail: JSON.stringify(err) });
            this.env.log.error('database unavailable, exiting');
          }
          else
          {
            this.mdbclient = client;
            this.setState(FSM.FSM_DONE);
            this.env.log.event(`mongodb: client connection started`);
          }
        });
    }
    if (this.state == DB.FSM_NEEDRELEASE)
    {
      this.setState(FSM.FSM_RELEASED);
      this.close();
      this.mdbclient = null;
      this.env.log.event(`mongodb: client connection closed`);
    }
  }
}

class KeySet implements FSM.ISet
{
  set: any;

  constructor()
  {
    this.reset();
  }

  reset(): void
  {
    this.set = {};
  }

  test(o: any): boolean
  {
    if (o._id === undefined) return true;
    let b: boolean = this.set[o._id] !== undefined;
    this.set[o._id] = true;
    return b;
  }
}

export class MongoCollection extends DB.DBCollection
{
  fsmStream: FSM.FsmArray;

  constructor(env: DBMongoEnvironment, client: MongoClient, name: string, options: any)
    {
      super(env, client, name, options);
      this.waitOn(client);
      this.col = null;
      this.fsmStream = null;
    }

  get env(): DBMongoEnvironment { return this._env as DBMongoEnvironment; }

  createStream(): FSM.FsmArray
  {
    if (this.fsmStream == null)
      this.fsmStream = new FSM.FsmArray(this.env, new KeySet());
    return this.fsmStream;
  }

  closeStream(): void
  {
    if (this.fsmStream)
    {
      this.fsmStream.setState(FSM.FSM_DONE);
      this.fsmStream = null;
    }
  }

  addToStream(o: any): void
  {
    if (this.fsmStream && o.id !== undefined)
      this.fsmStream.push(o);
  }

  mdbclient(): MDB.MongoClient
    {
      let c = this.client as MongoClient;
      return c.mdbclient;
    }

  forceError(): boolean
    {
      return (this.client as MongoClient).forceError();
    }

  tick(): void
    {
      if (this.ready)
      {
        if (this.isDependentError)
          this.setState(FSM.FSM_ERROR);
        else if (this.forceError() && this.forceError() && this.forceError()) // Don't do this too often
        {
          this.setState(FSM.FSM_ERROR);
          this.env.log.error('mongodb: createCollection: forcing error');
        }
        else if (this.state == FSM.FSM_STARTING)
        {
          this.setState(FSM.FSM_PENDING);
          this.mdbclient().db().collection(this.name, { strict: true }, (err: MDB.MongoError, col: any) => {
              if (this.done)
                return;
              else if (err)
              {
                this.setState(DB.FSM_CREATING);
                this.mdbclient().db().createCollection(this.name, (err: MDB.MongoError, result: any) => {
                    if (this.done)
                      return;
                    else if (err)
                    {
                      this.setState(FSM.FSM_ERROR);
                      this.env.log.error({ event: 'mongodb: createCollection', detail: `${this.name}: ${err.errmsg}` });
                    }
                    else
                    {
                      this.env.log.event(`mongodb: createCollection: ${this.name}: succeeded`);
                      this.mdbclient().db().collection(this.name, { strict: true }, (err: MDB.MongoError, col: any) => {
                          if (this.done)
                            return;
                          else if (err)
                          {
                            this.setState(FSM.FSM_ERROR);
                            this.env.log.error(`mongodb: collection: ${this.name}: unexpected failed after successful create: ${err.errmsg}`);
                          }
                          else
                          {
                            this.col = col;
                            this.setState(FSM.FSM_DONE);
                            this.env.log.event({ event: 'mongodb: collection opened', detail: this.name });
                          }
                        });
                    }
                  });
              }
              else
              {
                this.col = col;
                this.setState(FSM.FSM_DONE);
                this.env.log.event({ event: 'mongodb: collection opened', detail: this.name });
              }
            });
         }
       }
    }
}

export class MongoUpdate extends DB.DBUpdate
{
  trace: LogAbstract.AsyncTimer;

  constructor(env: DBMongoEnvironment, col: MongoCollection, query: any, values: any)
    {
      super(env, col, toDBInternal(query), toDBInternal(values));
      this.waitOn(col);
      this.trace = new LogAbstract.AsyncTimer(env.log, `mongodb: update(col=${col.name})`);
    }

  get env(): DBMongoEnvironment { return this._env as DBMongoEnvironment; }
  get mcol(): MongoCollection { return this.col as MongoCollection }

  forceError(): boolean
    {
      return (this.col.client as MongoClient).forceError();
    }

  tick(): void
    {
      if (this.ready)
      {
        if (this.isDependentError)
          this.setState(FSM.FSM_ERROR);
        else if (this.forceError())
        {
          this.setState(FSM.FSM_ERROR);
          this.env.log.error('mongodb: updateOne: forcing error');
        }
        else if (this.state == FSM.FSM_STARTING)
        {
          this.setState(FSM.FSM_PENDING);
          this.col.col.updateOne(this.query, { $set: this.values }, { upsert: true }, (err: MDB.MongoError, result: any) => {
              this.mcol.addToStream(this.query);
              if (this.done)
                return;
              else if (err)
              {
                this.setState(FSM.FSM_ERROR);
                this.trace.log();
                this.env.log.error({ event: 'mongodb: updateOne', detail: err.errmsg });
              }
              else
              {
                this.setState(FSM.FSM_DONE);
                this.result = result;
                this.trace.log();
                if (this.env.context.xnumber('verbosity'))
                  this.env.log.event({ event: 'mongodb: updateOne', detail: JSON.stringify(result) });
              }
            });
        }
      }
    }
}

export class MongoUnset extends DB.DBUnset
{
  trace: LogAbstract.AsyncTimer;

  constructor(env: DBMongoEnvironment, col: MongoCollection, query: any, values: any)
    {
      super(env, col, toDBInternal(query), toDBInternal(values));
      this.waitOn(col);
      this.trace = new LogAbstract.AsyncTimer(env.log, `mongodb: unset(col=${col.name})`);
    }

  get env(): DBMongoEnvironment { return this._env as DBMongoEnvironment; }
  get mcol(): MongoCollection { return this.col as MongoCollection }

  forceError(): boolean
    {
      return (this.col.client as MongoClient).forceError();
    }

  tick(): void
    {
      if (this.ready)
      {
        if (this.isDependentError)
          this.setState(FSM.FSM_ERROR);
        else if (this.forceError())
        {
          this.setState(FSM.FSM_ERROR);
          this.env.log.error('mongodb: updateOne: forcing error');
        }
        else if (this.state == FSM.FSM_STARTING)
        {
          this.setState(FSM.FSM_PENDING);
          this.col.col.updateOne(this.query, { $unset: this.values }, (err: MDB.MongoError, result: any) => {
              this.mcol.addToStream(this.query);
              if (this.done)
                return;
              else if (err)
              {
                this.setState(FSM.FSM_ERROR);
                this.trace.log();
                this.env.log.error({ event: 'mongodb: updateOne', detail: err.errmsg });
              }
              else
              {
                this.setState(FSM.FSM_DONE);
                this.result = result;
                this.trace.log();
                if (this.env.context.xnumber('verbosity'))
                  this.env.log.event({ event: 'mongodb: updateOne', detail: JSON.stringify(result) });
              }
            });
        }
      }
    }
}

export class MongoDelete extends DB.DBDelete
{
  trace: LogAbstract.AsyncTimer;

  constructor(env: DBMongoEnvironment, col: MongoCollection, query: any)
    {
      super(env, col, toDBInternal(query));
      this.waitOn(col);
      this.trace = new LogAbstract.AsyncTimer(env.log, `mongodb: delete(col=${col.name})`);
    }

  get env(): DBMongoEnvironment { return this._env as DBMongoEnvironment; }

  forceError(): boolean
    {
      return (this.col.client as MongoClient).forceError();
    }

  tick(): void
    {
      if (this.ready)
      {
        if (this.isDependentError)
          this.setState(FSM.FSM_ERROR);
        else if (this.forceError())
        {
          this.setState(FSM.FSM_ERROR);
          this.env.log.error('mongodb: deleteOne: forcing error');
        }
        else if (this.state == FSM.FSM_STARTING)
        {
          this.setState(FSM.FSM_PENDING);
          this.col.col.deleteOne(this.query, (err: MDB.MongoError, result: any) => {
              if (this.done)
                return;
              else if (err)
              {
                this.setState(FSM.FSM_ERROR);
                this.trace.log();
                this.env.log.error({ event: 'mongodb: deleteOne: failed', detail: err.errmsg });
              }
              else
              {
                this.setState(FSM.FSM_DONE);
                this.result = result;
                this.trace.log();
                if (this.env.context.xnumber('verbosity'))
                  this.env.log.event({ event: 'mongodb: deleteOne: succeeded', detail: JSON.stringify(result) });
              }
            });
        }
      }
    }
}

export class MongoFind extends DB.DBFind
{
  trace: LogAbstract.AsyncTimer;
  prevFind: MongoFind;

  constructor(env: DBMongoEnvironment, col: MongoCollection, filter: any)
    {
      super(env, col, toDBInternal(filter));
      this.waitOn(col);
      this.trace = new LogAbstract.AsyncTimer(env.log, `mongodb: find(col=${col.name})`);
      this.prevFind = null;
    }

  get env(): DBMongoEnvironment { return this._env as DBMongoEnvironment; }

  forceError(): boolean
    {
      return (this.col.client as MongoClient).forceError();
    }

  tick(): void
    {
      if (this.ready)
      {
        if (this.isDependentError)
          this.setState(FSM.FSM_ERROR);
        else if (this.forceError())
        {
          this.setState(FSM.FSM_ERROR);
          this.env.log.error('mongodb: findOne: forcing error');
        }
        else if (this.state == FSM.FSM_STARTING)
        {
          this.setState(FSM.FSM_PENDING);
          this.col.col.findOne(this.filter, (err: MDB.MongoError, result: any) => {
              if (this.done)
                return;
              else if (err)
              {
                this.setState(FSM.FSM_ERROR);
                this.trace.log();
                this.env.log.error({ event: 'mongodb: findOne', detail: JSON.stringify(err) });
              }
              else
              {
                this.setState(FSM.FSM_DONE);
                this.result = toDBExternal(result);
                this.trace.log();
                if (this.env.context.xnumber('verbosity'))
                  this.env.log.event( { event: '`mongodb: findOne', detail: JSON.stringify(result) });
              }
            });
        }
      }
    }
}

export class MongoQuery extends DB.DBQuery
{
  cursor: MDB.Cursor;
  trace: LogAbstract.AsyncTimer;
  bError: boolean;

  constructor(env: DBMongoEnvironment, col: MongoCollection, filter: any)
    {
      super(env, col, toDBInternal(filter));
      this.waitOn(col);
      this.cursor = null;
      this.trace = new LogAbstract.AsyncTimer(env.log, `mongodb: query(col=${col.name})`);
      if (this.env.context.xnumber('verbosity'))
        this.env.log.event({ event: 'mongodb: query in ${col.name}', detail: JSON.stringify(filter) });
    }

  get env(): DBMongoEnvironment { return this._env as DBMongoEnvironment; }

  forceError(): boolean
    {
      return (this.col.client as MongoClient).forceError();
    }

  tick(): void
    {
      if (this.ready && this.isDependentError)
        this.setState(FSM.FSM_ERROR);
      else if (this.ready)
      {
        if (this.state == FSM.FSM_STARTING)
        {
          if (this.forceError())
          {
            this.env.log.error('mongodb: query: forcing error');
            this.setState(FSM.FSM_ERROR);
          }
          else
          {
            this.setState(FSM.FSM_PENDING);
            try
            {
              this.cursor = this.col.col.find(this.filter);
            }
            catch (err)
            {
              this.setState(FSM.FSM_ERROR);
              this.trace.log();
            }
          }
        }
        if (this.state == FSM.FSM_PENDING)
        {
          this.setState(DB.FSM_READING);
          this.cursor.next((err: MDB.MongoError, result: any) => {
              if (this.done)
                return;
              else if (err)
              {
                this.bError = true;
                this.setState(DB.FSM_NEEDRELEASE);
                this.trace.log();
                this.env.log.error({ event: 'mongodb: cursor.next', detail: err.errmsg });
              }
              else if (result)
              {
                this.fsmResult.push(toDBExternal(result));
                this.setState(FSM.FSM_PENDING);
              }
              else
              {
                this.setState(DB.FSM_NEEDRELEASE);
                this.trace.log();
                if (this.env.context.xflag('verbosity'))
                {
                  for (let i: number = 0; i < this.result.length; i++)
                    this.env.log.event(`mongodb: mongodb: query: ${i}: ${JSON.stringify(this.result[i])}`);
                }
              }
            });
        }
        if (this.state === DB.FSM_NEEDRELEASE)
        {
          this.setState(DB.FSM_RELEASING);
          this.cursor.close((err: MDB.MongoError) => {
              this.cursor = null;
              this.setState(this.bError ? FSM.FSM_ERROR : FSM.FSM_DONE);
              this.fsmResult.setState(this.state);
            });
        }
      }
    }
}

export class MongoIndex extends DB.DBIndex
{
  trace: LogAbstract.AsyncTimer;

  constructor(env: DBMongoEnvironment, col: MongoCollection, uid: string)
    {
      super(env, col, uid);
      this.waitOn(col);
      this.trace = new LogAbstract.AsyncTimer(env.log, `mongodb: index(col=${col.name})`);
    }

  get env(): DBMongoEnvironment { return this._env as DBMongoEnvironment; }

  tick(): void
    {
      if (this.ready && this.isDependentError)
        this.setState(FSM.FSM_ERROR);
      else if (this.ready && this.state == FSM.FSM_STARTING)
      {
        this.setState(FSM.FSM_PENDING);
        this.col.col.createIndex( { [this.uid]: 1 }, (err: MDB.MongoError, result: any) => {
            if (this.done)
              return;
            else if (err)
            {
              this.setState(FSM.FSM_ERROR);
              this.trace.log();
              this.env.log.error({ event: 'mongodb: createIndex', detail: JSON.stringify(err.errmsg) });
            }
            else
            {
              this.setState(FSM.FSM_DONE);
              this.trace.log();
              if (this.env.context.xnumber('verbosity'))
                this.env.log.event({ event: 'mongodb: createIndex: succeeded', detail: JSON.stringify(result) });
            }
          });
      }
    }
}

export class MongoClose extends DB.DBClose
{
  constructor(env: DBMongoEnvironment, client: MongoClient)
    {
      super(env, client);
    }
}

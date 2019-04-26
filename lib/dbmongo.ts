// Node
import * as fs from 'fs';

// Public mongodb API
import * as MDB from 'mongodb';

// Shared libraries
import * as Util from '@terrencecrowley/util';
import * as Context from '@terrencecrowley/context';
import * as Log from '@terrencecrowley/log';
import * as Storage from '@terrencecrowley/storage';
import * as FSM from '@terrencecrowley/fsm';
import * as DB from '@terrencecrowley/dbabstract';

Context.setDefaults(
  {
    aws_mongodb_uri: '',
    aws_mongodb_username: '',
    aws_mongodb_password: '',
    mongo_error_frequency: 0,
  });

const Production = Context.xflag('production');
const InstanceUrl = Context.xstring('aws_mongodb_uri') + (Production ? '/prod' : '/dev');
const UserName = Context.xstring('aws_mongodb_username');
const Password = Context.xstring('aws_mongodb_password');

const mongoErrorFrequency: number = Context.xnumber('mongo_error_frequency');

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

export class MongoClient extends DB.DBClient
{
  mdbclient: MDB.MongoClient;
  serializerUpdate: FSM.FsmSerializer;

  constructor(storageManager: Storage.StorageManager = null)
    {
      super('MongoClient', storageManager);
      this.mdbclient = null;
      this.serializerUpdate = new FSM.FsmSerializer();
    }

  createCollection(name: string, options: any): DB.DBCollection
    {  
      return new MongoCollection('MongoCollection', this, name, options);
    }

  createUpdate(col: MongoCollection, query: any, values: any): DB.DBUpdate
    {
      let update = new MongoUpdate('MongoUpdate', col, query, values);
      if (query && query.id)
        this.serializerUpdate.serialize(query.id, update);
      return update;
    }

  createDelete(col: MongoCollection, query: any): DB.DBDelete
    {
      return new MongoDelete('MongoDelete', col, query);
    }

  createFind(col: MongoCollection, filter: any): DB.DBFind
    {
      return new MongoFind('MongoFind', col, filter);
    }

  createQuery(col: MongoCollection, filter: any): DB.DBQuery
    {
      return new MongoQuery('MongoQuery', col, filter);
    }

  createIndex(col: MongoCollection, uid: string): DB.DBIndex
    {
      return new MongoIndex('MongoIndex', col, uid);
    }

  createClose(): DB.DBClose
    {
      return new MongoClose('MongoClose', this);
    }

  forceError(): boolean
  {
    if (!Production && (Math.random() < mongoErrorFrequency))
      return true;
    return false;
  }

  tick(): void
    {
      if (this.ready && this.state == FSM.FSM_STARTING)
      {
        this.setState(FSM.FSM_PENDING);

        let sslCA = readPem();
        let mdbOptions = { auth: { user: UserName, password: Password }, ssl: true, sslCA: sslCA, useNewUrlParser: true };
        let localClient = new MDB.MongoClient(InstanceUrl, mdbOptions);
        Log.event({ event: 'mongodb: connecting to database', detail:  InstanceUrl });

        localClient.connect((err: MDB.MongoError, client: MDB.MongoClient) => {
            if (this.done)
              return;
            else if (err)
            {
              this.setState(FSM.FSM_ERROR);
              Log.error({ event: 'client connection failed', detail: JSON.stringify(err) });
              Log.error('database unavailable, exiting');
              Log.dump();
              process.exit(1);
            }
            else
            {
              this.mdbclient = client;
              this.setState(FSM.FSM_DONE);
              Log.event(`mongodb: client connection started`);
            }
          });
      }
      if (this.state == DB.FSM_NEEDRELEASE)
      {
        this.setState(FSM.FSM_RELEASED);
        this.close();
        this.mdbclient = null;
        Log.event(`mongodb: client connection closed`);
      }
    }
}

export class MongoCollection extends DB.DBCollection
{
  constructor(typeName: string, client: MongoClient, name: string, options: any)
    {
      super(typeName, client, name, options);
      this.waitOn(client);
      this.col = null;
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
        if (this.isChildError)
          this.setState(FSM.FSM_ERROR);
        else if (this.forceError() && this.forceError() && this.forceError()) // Don't do this too often
        {
          this.setState(FSM.FSM_ERROR);
          Log.error('mongodb: createCollection: forcing error');
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
                      Log.error({ event: 'mongodb: createCollection', detail: `${this.name}: ${err.errmsg}` });
                    }
                    else
                    {
                      Log.event(`mongodb: createCollection: ${this.name}: succeeded`);
                      this.mdbclient().db().collection(this.name, { strict: true }, (err: MDB.MongoError, col: any) => {
                          if (this.done)
                            return;
                          else if (err)
                          {
                            this.setState(FSM.FSM_ERROR);
                            Log.error(`mongodb: collection: ${this.name}: unexpected failed after successful create: ${err.errmsg}`);
                          }
                          else
                          {
                            this.col = col;
                            this.setState(FSM.FSM_DONE);
                            Log.event({ event: 'mongodb: collection opened', detail: this.name });
                          }
                        });
                    }
                  });
              }
              else
              {
                this.col = col;
                this.setState(FSM.FSM_DONE);
                Log.event({ event: 'mongodb: collection opened', detail: this.name });
              }
            });
         }
       }
    }
}

export class MongoUpdate extends DB.DBUpdate
{
  trace: Log.AsyncTimer;

  constructor(typeName: string, col: MongoCollection, query: any, values: any)
    {
      super(typeName, col, toDBInternal(query), toDBInternal(values));
      this.waitOn(col);
      this.trace = new Log.AsyncTimer(`mongodb: update in ${col.name}`);
    }

  forceError(): boolean
    {
      return (this.col.client as MongoClient).forceError();
    }

  tick(): void
    {
      if (this.ready)
      {
        if (this.isChildError)
          this.setState(FSM.FSM_ERROR);
        else if (this.forceError())
        {
          this.setState(FSM.FSM_ERROR);
          Log.error('mongodb: updateOne: forcing error');
        }
        else if (this.state == FSM.FSM_STARTING)
        {
          this.setState(FSM.FSM_PENDING);
          this.col.col.updateOne(this.query, { $set: this.values }, { upsert: true }, (err: MDB.MongoError, result: any) => {
              if (this.done)
                return;
              else if (err)
              {
                this.setState(FSM.FSM_ERROR);
                this.trace.log();
                Log.error({ event: 'mongodb: updateOne', detail: err.errmsg });
              }
              else
              {
                this.setState(FSM.FSM_DONE);
                this.result = result;
                this.trace.log();
                if (Context.verbosity)
                  Log.event({ event: 'mongodb: updateOne', detail: JSON.stringify(result) });
              }
            });
        }
      }
    }
}

export class MongoDelete extends DB.DBDelete
{
  trace: Log.AsyncTimer;

  constructor(typeName: string, col: MongoCollection, query: any)
    {
      super(typeName, col, toDBInternal(query));
      this.waitOn(col);
      this.trace = new Log.AsyncTimer(`mongodb: delete in ${col.name}`);
    }

  forceError(): boolean
    {
      return (this.col.client as MongoClient).forceError();
    }

  tick(): void
    {
      if (this.ready)
      {
        if (this.isChildError)
          this.setState(FSM.FSM_ERROR);
        else if (this.forceError())
        {
          this.setState(FSM.FSM_ERROR);
          Log.error('mongodb: deleteOne: forcing error');
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
                Log.error({ event: 'mongodb: deleteOne: failed', detail: err.errmsg });
              }
              else
              {
                this.setState(FSM.FSM_DONE);
                this.result = result;
                this.trace.log();
                if (Context.verbosity)
                  Log.event({ event: 'mongodb: deleteOne: succeeded', detail: JSON.stringify(result) });
              }
            });
        }
      }
    }
}

export class MongoFind extends DB.DBFind
{
  trace: Log.AsyncTimer;
  prevFind: MongoFind;

  constructor(typeName: string, col: MongoCollection, filter: any)
    {
      super(typeName, col, toDBInternal(filter));
      this.waitOn(col);
      this.trace = new Log.AsyncTimer(`mongodb: find in ${col.name}`);
      this.prevFind = null;
    }

  forceError(): boolean
    {
      return (this.col.client as MongoClient).forceError();
    }

  tick(): void
    {
      if (this.ready)
      {
        if (this.isChildError)
          this.setState(FSM.FSM_ERROR);
        else if (this.forceError())
        {
          this.setState(FSM.FSM_ERROR);
          Log.error('mongodb: findOne: forcing error');
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
                Log.error({ event: 'mongodb: findOne', detail: JSON.stringify(err) });
              }
              else
              {
                this.setState(FSM.FSM_DONE);
                this.result = toDBExternal(result);
                this.trace.log();
                if (Context.verbosity)
                  Log.event( { event: '`mongodb: findOne', detail: JSON.stringify(result) });
              }
            });
        }
      }
    }
}

export class MongoQuery extends DB.DBQuery
{
  cursor: MDB.Cursor;
  trace: Log.AsyncTimer;

  constructor(typeName: string, col: MongoCollection, filter: any)
    {
      super(typeName, col, toDBInternal(filter));
      this.waitOn(col);
      this.cursor = null;
      this.trace = new Log.AsyncTimer(`mongodb: query in ${col.name}`);
      if (Context.verbosity)
        Log.event({ event: 'mongodb: query in ${col.name}', detail: JSON.stringify(filter) });
    }

  forceError(): boolean
    {
      return (this.col.client as MongoClient).forceError();
    }

  tick(): void
    {
      if (this.ready && this.isChildError)
        this.setState(FSM.FSM_ERROR);
      else if (this.ready)
      {
        if (this.state == FSM.FSM_STARTING)
        {
          if (this.forceError())
          {
            Log.error('mongodb: query: forcing error');
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
                this.setState(FSM.FSM_ERROR | DB.FSM_NEEDRELEASE);
                this.trace.log();
                Log.error({ event: 'mongodb: cursor.next', detail: err.errmsg });
              }
              else if (result)
              {
                this.result.push(toDBExternal(result));
                this.setState(FSM.FSM_PENDING);
              }
              else
              {
                this.setState(FSM.FSM_DONE | DB.FSM_NEEDRELEASE);
                this.trace.log();
                if (Context.verbosity)
                {
                  for (let i: number = 0; i < this.result.length; i++)
                    Log.event(`mongodb: mongodb: query: ${i}: ${JSON.stringify(this.result[i])}`);
                }
              }
            });
        }
        if (this.state & DB.FSM_NEEDRELEASE)
        {
          this.setState((this.state & ~DB.FSM_NEEDRELEASE) | DB.FSM_RELEASING);
          this.cursor.close((err: MDB.MongoError) => {
              this.cursor = null;
              this.state &= ~DB.FSM_RELEASING;
            });
        }
      }
    }
}

export class MongoIndex extends DB.DBIndex
{
  trace: Log.AsyncTimer;

  constructor(typeName: string, col: MongoCollection, uid: string)
    {
      super(typeName, col, uid);
      this.waitOn(col);
      this.trace = new Log.AsyncTimer(`mongodb: index in ${col.name}`);
    }

  tick(): void
    {
      if (this.ready && this.isChildError)
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
              Log.error({ event: 'mongodb: createIndex', detail: JSON.stringify(err.errmsg) });
            }
            else
            {
              this.setState(FSM.FSM_DONE);
              this.trace.log();
              if (Context.verbosity)
                Log.event({ event: 'mongodb: createIndex: succeeded', detail: JSON.stringify(result) });
            }
          });
      }
    }
}

export class MongoClose extends DB.DBClose
{
  constructor(typeName: string, client: MongoClient)
    {
      super(typeName, client);
    }
}

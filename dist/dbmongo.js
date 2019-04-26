(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["dbmongo"] = factory();
	else
		root["dbmongo"] = factory();
})(global, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./lib/all.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./lib/all.ts":
/*!********************!*\
  !*** ./lib/all.ts ***!
  \********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(__webpack_require__(/*! ./dbmongo */ "./lib/dbmongo.ts"));


/***/ }),

/***/ "./lib/dbmongo.ts":
/*!************************!*\
  !*** ./lib/dbmongo.ts ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
// Node
const fs = __webpack_require__(/*! fs */ "fs");
// Public mongodb API
const MDB = __webpack_require__(/*! mongodb */ "mongodb");
// Shared libraries
const Util = __webpack_require__(/*! @terrencecrowley/util */ "@terrencecrowley/util");
const Context = __webpack_require__(/*! @terrencecrowley/context */ "@terrencecrowley/context");
const Log = __webpack_require__(/*! @terrencecrowley/log */ "@terrencecrowley/log");
const FSM = __webpack_require__(/*! @terrencecrowley/fsm */ "@terrencecrowley/fsm");
const DB = __webpack_require__(/*! @terrencecrowley/dbabstract */ "@terrencecrowley/dbabstract");
Context.setDefaults({
    aws_mongodb_uri: '',
    aws_mongodb_username: '',
    aws_mongodb_password: '',
    mongo_error_frequency: 0,
});
const Production = Context.xflag('production');
const InstanceUrl = Context.xstring('aws_mongodb_uri') + (Production ? '/prod' : '/dev');
const UserName = Context.xstring('aws_mongodb_username');
const Password = Context.xstring('aws_mongodb_password');
const mongoErrorFrequency = Context.xnumber('mongo_error_frequency');
function readPem() {
    return [fs.readFileSync('rds-combined-ca-bundle.pem', 'utf8')];
}
function toDBInternal(o) {
    if (o && o.id !== undefined) {
        o = Util.shallowCopy(o);
        o._id = o.id;
        delete o.id;
    }
    return o;
}
function toDBExternal(o) {
    if (o && o._id !== undefined) {
        o = Util.shallowCopy(o);
        o.id = o._id;
        delete o._id;
    }
    return o;
}
class MongoClient extends DB.DBClient {
    constructor(storageManager = null) {
        super('MongoClient', storageManager);
        this.mdbclient = null;
        this.serializerUpdate = new FSM.FsmSerializer();
    }
    createCollection(name, options) {
        return new MongoCollection('MongoCollection', this, name, options);
    }
    createUpdate(col, query, values) {
        let update = new MongoUpdate('MongoUpdate', col, query, values);
        if (query && query.id)
            this.serializerUpdate.serialize(query.id, update);
        return update;
    }
    createDelete(col, query) {
        return new MongoDelete('MongoDelete', col, query);
    }
    createFind(col, filter) {
        return new MongoFind('MongoFind', col, filter);
    }
    createQuery(col, filter) {
        return new MongoQuery('MongoQuery', col, filter);
    }
    createIndex(col, uid) {
        return new MongoIndex('MongoIndex', col, uid);
    }
    createClose() {
        return new MongoClose('MongoClose', this);
    }
    forceError() {
        if (!Production && (Math.random() < mongoErrorFrequency))
            return true;
        return false;
    }
    tick() {
        if (this.ready && this.state == FSM.FSM_STARTING) {
            this.setState(FSM.FSM_PENDING);
            let sslCA = readPem();
            let mdbOptions = { auth: { user: UserName, password: Password }, ssl: true, sslCA: sslCA, useNewUrlParser: true };
            let localClient = new MDB.MongoClient(InstanceUrl, mdbOptions);
            Log.event({ event: 'mongodb: connecting to database', detail: InstanceUrl });
            localClient.connect((err, client) => {
                if (this.done)
                    return;
                else if (err) {
                    this.setState(FSM.FSM_ERROR);
                    Log.error({ event: 'client connection failed', detail: JSON.stringify(err) });
                    Log.error('database unavailable, exiting');
                    Log.dump();
                    process.exit(1);
                }
                else {
                    this.mdbclient = client;
                    this.setState(FSM.FSM_DONE);
                    Log.event(`mongodb: client connection started`);
                }
            });
        }
        if (this.state == DB.FSM_NEEDRELEASE) {
            this.setState(FSM.FSM_RELEASED);
            this.close();
            this.mdbclient = null;
            Log.event(`mongodb: client connection closed`);
        }
    }
}
exports.MongoClient = MongoClient;
class MongoCollection extends DB.DBCollection {
    constructor(typeName, client, name, options) {
        super(typeName, client, name, options);
        this.waitOn(client);
        this.col = null;
    }
    mdbclient() {
        let c = this.client;
        return c.mdbclient;
    }
    forceError() {
        return this.client.forceError();
    }
    tick() {
        if (this.ready) {
            if (this.isChildError)
                this.setState(FSM.FSM_ERROR);
            else if (this.forceError() && this.forceError() && this.forceError()) // Don't do this too often
             {
                this.setState(FSM.FSM_ERROR);
                Log.error('mongodb: createCollection: forcing error');
            }
            else if (this.state == FSM.FSM_STARTING) {
                this.setState(FSM.FSM_PENDING);
                this.mdbclient().db().collection(this.name, { strict: true }, (err, col) => {
                    if (this.done)
                        return;
                    else if (err) {
                        this.setState(DB.FSM_CREATING);
                        this.mdbclient().db().createCollection(this.name, (err, result) => {
                            if (this.done)
                                return;
                            else if (err) {
                                this.setState(FSM.FSM_ERROR);
                                Log.error({ event: 'mongodb: createCollection', detail: `${this.name}: ${err.errmsg}` });
                            }
                            else {
                                Log.event(`mongodb: createCollection: ${this.name}: succeeded`);
                                this.mdbclient().db().collection(this.name, { strict: true }, (err, col) => {
                                    if (this.done)
                                        return;
                                    else if (err) {
                                        this.setState(FSM.FSM_ERROR);
                                        Log.error(`mongodb: collection: ${this.name}: unexpected failed after successful create: ${err.errmsg}`);
                                    }
                                    else {
                                        this.col = col;
                                        this.setState(FSM.FSM_DONE);
                                        Log.event({ event: 'mongodb: collection opened', detail: this.name });
                                    }
                                });
                            }
                        });
                    }
                    else {
                        this.col = col;
                        this.setState(FSM.FSM_DONE);
                        Log.event({ event: 'mongodb: collection opened', detail: this.name });
                    }
                });
            }
        }
    }
}
exports.MongoCollection = MongoCollection;
class MongoUpdate extends DB.DBUpdate {
    constructor(typeName, col, query, values) {
        super(typeName, col, toDBInternal(query), toDBInternal(values));
        this.waitOn(col);
        this.trace = new Log.AsyncTimer(`mongodb: update in ${col.name}`);
    }
    forceError() {
        return this.col.client.forceError();
    }
    tick() {
        if (this.ready) {
            if (this.isChildError)
                this.setState(FSM.FSM_ERROR);
            else if (this.forceError()) {
                this.setState(FSM.FSM_ERROR);
                Log.error('mongodb: updateOne: forcing error');
            }
            else if (this.state == FSM.FSM_STARTING) {
                this.setState(FSM.FSM_PENDING);
                this.col.col.updateOne(this.query, { $set: this.values }, { upsert: true }, (err, result) => {
                    if (this.done)
                        return;
                    else if (err) {
                        this.setState(FSM.FSM_ERROR);
                        this.trace.log();
                        Log.error({ event: 'mongodb: updateOne', detail: err.errmsg });
                    }
                    else {
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
exports.MongoUpdate = MongoUpdate;
class MongoDelete extends DB.DBDelete {
    constructor(typeName, col, query) {
        super(typeName, col, toDBInternal(query));
        this.waitOn(col);
        this.trace = new Log.AsyncTimer(`mongodb: delete in ${col.name}`);
    }
    forceError() {
        return this.col.client.forceError();
    }
    tick() {
        if (this.ready) {
            if (this.isChildError)
                this.setState(FSM.FSM_ERROR);
            else if (this.forceError()) {
                this.setState(FSM.FSM_ERROR);
                Log.error('mongodb: deleteOne: forcing error');
            }
            else if (this.state == FSM.FSM_STARTING) {
                this.setState(FSM.FSM_PENDING);
                this.col.col.deleteOne(this.query, (err, result) => {
                    if (this.done)
                        return;
                    else if (err) {
                        this.setState(FSM.FSM_ERROR);
                        this.trace.log();
                        Log.error({ event: 'mongodb: deleteOne: failed', detail: err.errmsg });
                    }
                    else {
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
exports.MongoDelete = MongoDelete;
class MongoFind extends DB.DBFind {
    constructor(typeName, col, filter) {
        super(typeName, col, toDBInternal(filter));
        this.waitOn(col);
        this.trace = new Log.AsyncTimer(`mongodb: find in ${col.name}`);
        this.prevFind = null;
    }
    forceError() {
        return this.col.client.forceError();
    }
    tick() {
        if (this.ready) {
            if (this.isChildError)
                this.setState(FSM.FSM_ERROR);
            else if (this.forceError()) {
                this.setState(FSM.FSM_ERROR);
                Log.error('mongodb: findOne: forcing error');
            }
            else if (this.state == FSM.FSM_STARTING) {
                this.setState(FSM.FSM_PENDING);
                this.col.col.findOne(this.filter, (err, result) => {
                    if (this.done)
                        return;
                    else if (err) {
                        this.setState(FSM.FSM_ERROR);
                        this.trace.log();
                        Log.error({ event: 'mongodb: findOne', detail: JSON.stringify(err) });
                    }
                    else {
                        this.setState(FSM.FSM_DONE);
                        this.result = toDBExternal(result);
                        this.trace.log();
                        if (Context.verbosity)
                            Log.event({ event: '`mongodb: findOne', detail: JSON.stringify(result) });
                    }
                });
            }
        }
    }
}
exports.MongoFind = MongoFind;
class MongoQuery extends DB.DBQuery {
    constructor(typeName, col, filter) {
        super(typeName, col, toDBInternal(filter));
        this.waitOn(col);
        this.cursor = null;
        this.trace = new Log.AsyncTimer(`mongodb: query in ${col.name}`);
        if (Context.verbosity)
            Log.event({ event: 'mongodb: query in ${col.name}', detail: JSON.stringify(filter) });
    }
    forceError() {
        return this.col.client.forceError();
    }
    tick() {
        if (this.ready && this.isChildError)
            this.setState(FSM.FSM_ERROR);
        else if (this.ready) {
            if (this.state == FSM.FSM_STARTING) {
                if (this.forceError()) {
                    Log.error('mongodb: query: forcing error');
                    this.setState(FSM.FSM_ERROR);
                }
                else {
                    this.setState(FSM.FSM_PENDING);
                    try {
                        this.cursor = this.col.col.find(this.filter);
                    }
                    catch (err) {
                        this.setState(FSM.FSM_ERROR);
                        this.trace.log();
                    }
                }
            }
            if (this.state == FSM.FSM_PENDING) {
                this.setState(DB.FSM_READING);
                this.cursor.next((err, result) => {
                    if (this.done)
                        return;
                    else if (err) {
                        this.setState(FSM.FSM_ERROR | DB.FSM_NEEDRELEASE);
                        this.trace.log();
                        Log.error({ event: 'mongodb: cursor.next', detail: err.errmsg });
                    }
                    else if (result) {
                        this.result.push(toDBExternal(result));
                        this.setState(FSM.FSM_PENDING);
                    }
                    else {
                        this.setState(FSM.FSM_DONE | DB.FSM_NEEDRELEASE);
                        this.trace.log();
                        if (Context.verbosity) {
                            for (let i = 0; i < this.result.length; i++)
                                Log.event(`mongodb: mongodb: query: ${i}: ${JSON.stringify(this.result[i])}`);
                        }
                    }
                });
            }
            if (this.state & DB.FSM_NEEDRELEASE) {
                this.setState((this.state & ~DB.FSM_NEEDRELEASE) | DB.FSM_RELEASING);
                this.cursor.close((err) => {
                    this.cursor = null;
                    this.state &= ~DB.FSM_RELEASING;
                });
            }
        }
    }
}
exports.MongoQuery = MongoQuery;
class MongoIndex extends DB.DBIndex {
    constructor(typeName, col, uid) {
        super(typeName, col, uid);
        this.waitOn(col);
        this.trace = new Log.AsyncTimer(`mongodb: index in ${col.name}`);
    }
    tick() {
        if (this.ready && this.isChildError)
            this.setState(FSM.FSM_ERROR);
        else if (this.ready && this.state == FSM.FSM_STARTING) {
            this.setState(FSM.FSM_PENDING);
            this.col.col.createIndex({ [this.uid]: 1 }, (err, result) => {
                if (this.done)
                    return;
                else if (err) {
                    this.setState(FSM.FSM_ERROR);
                    this.trace.log();
                    Log.error({ event: 'mongodb: createIndex', detail: JSON.stringify(err.errmsg) });
                }
                else {
                    this.setState(FSM.FSM_DONE);
                    this.trace.log();
                    if (Context.verbosity)
                        Log.event({ event: 'mongodb: createIndex: succeeded', detail: JSON.stringify(result) });
                }
            });
        }
    }
}
exports.MongoIndex = MongoIndex;
class MongoClose extends DB.DBClose {
    constructor(typeName, client) {
        super(typeName, client);
    }
}
exports.MongoClose = MongoClose;


/***/ }),

/***/ "@terrencecrowley/context":
/*!*******************************************!*\
  !*** external "@terrencecrowley/context" ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("@terrencecrowley/context");

/***/ }),

/***/ "@terrencecrowley/dbabstract":
/*!**********************************************!*\
  !*** external "@terrencecrowley/dbabstract" ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("@terrencecrowley/dbabstract");

/***/ }),

/***/ "@terrencecrowley/fsm":
/*!***************************************!*\
  !*** external "@terrencecrowley/fsm" ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("@terrencecrowley/fsm");

/***/ }),

/***/ "@terrencecrowley/log":
/*!***************************************!*\
  !*** external "@terrencecrowley/log" ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("@terrencecrowley/log");

/***/ }),

/***/ "@terrencecrowley/util":
/*!****************************************!*\
  !*** external "@terrencecrowley/util" ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("@terrencecrowley/util");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("fs");

/***/ }),

/***/ "mongodb":
/*!**************************!*\
  !*** external "mongodb" ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

module.exports = require("mongodb");

/***/ })

/******/ });
});
//# sourceMappingURL=dbmongo.js.map
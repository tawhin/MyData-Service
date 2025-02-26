const { MongoClient, ObjectID } = require("mongodb");
const config = require("../config/mongo-repository");

/**
 * Perform the specified action on the specified collection through a MongoDb client.
 *
 * @param {string} collection - Target Mongo DB collection.
 * @param {function(Collection):void} operation - Operation to logic to perform against the provided db Collection
 * @param {function(Error,object):void} callback - Asynchronous callback once the perform operation completes.
 */
const perform = async (collection, operation, callback) => {
  const client = new MongoClient(config.location);
  let result = null;
  let error = null;

  try {
    await client.connect();
    const db = client.db(config.dbName);

    try {
      result = await operation(db.collection(collection));
    } catch (err) {
      console.log(err);
      error = err;
    }
  } catch (err) {
    console.log(
      `Failed connect to mongodb url: ${config.location}, db: ${config.dbName}, collection: ${namespace}`
    );
    error = err;
  } finally {
    // final action within the try statement is to close the MongoDb client.
    client.close();
  }

  // Asynchronous callback.
  callback(error, result);
};

/**
 * Create a document from the specified data object, into the specified collection.  The document will be given a
 * unique id property when inserted into the collection.
 * @function create
 * @param {string} collection - Target Mongo DB collection.
 * @param {object} data - Data to be added to the collection
 * @param {function(Error,object):void} callback - Asynchronous callback to signal when the operation completes.
 */
const create = (collection, data, callback) => {
  const operation = (dbCollection) => {
    return new Promise(async (resolve, reject) => {
      try {
        const item = await dbCollection.insertOne(data);
        resolve(item.ops[0]._id);
      } catch (err) {
        reject(
          new Error(
            `Failed to create a document in collection: ${collection}. Reason: ${err.message}`
          )
        );
      }
    });
  };

  perform(collection, operation, callback);
};

/**
 * Provide complete list of documents within the specified collection.
 * @function list
 * @param {string} collection - Addressed Mongo DB collection.
 * @param {function(Error,object):void} callback - Asynchronous callback
 */
const list = (collection, callback) => {
  const operation = (dbCollection) => {
    return new Promise(async (resolve, reject) => {
      try {
        const items = await dbCollection.find();
        resolve(await items.toArray());
      } catch (err) {
        reject(
          new Error(
            `Failed to find all documents within in collection: ${collection}. Reason: ${err.message}`
          )
        );
      }
    });
  };

  perform(collection, operation, callback);
};

/**
 * Update the document correlating to the specified identifier with the specified data object within the
 * specified collection.
 *
 * @param {string} collection - Addressed Mongo DB collection.
 * @param {string} id - Specified document identifier
 * @param {object} data - Updated document object
 * @param {function(Error,object):void} callback - Callback with operation result.
 */
const update = async (collection, id, data, callback) => {
  const operation = (dbCollection) => {
    return new Promise(async (resolve, reject) => {
      try {
        const query = { _id: ObjectID(id) };
        const update = { $set: data };
        // Add the document if the specified id doesn't exist.
        const options = { upsert: true, returnOriginal: false };
        const item = await dbCollection.updateOne(query, update, options);
        // return true (created) if the modified count is 0
        resolve(item.modifiedCount === 0);
      } catch (err) {
        reject(
          new Error(
            `Failed to update id: ${id} within collection: ${collection}. Reason: ${err.message}`
          )
        );
      }
    });
  };

  perform(collection, operation, callback);
};

/**
 * Attempt to remove document against the specified identifier from the specified MongoDB collection.
 * @function remove
 * @param {string} collection - Addressed Mongo DB collection.
 * @param {string} id - Specified document identifier
 * @param {function(Error,object):void} callback - Asynchronous callback when operation completes
 */
const remove = async (collection, id, callback) => {
  const operation = (dbCollection) => {
    return new Promise(async (resolve, reject) => {
      try {
        const result = await dbCollection.deleteOne({ _id: ObjectID(id) });
        resolve(result.deletedCount === 1);
      } catch (err) {
        reject(
          new Error(
            `Failed to delete document id: ${id} within collection: ${collection}. Reason: ${err.message}`
          )
        );
      }
    });
  };

  perform(collection, operation, callback);
};

module.exports = {
  // Export CRUD operations
  create: create,
  read: list,
  update: update,
  delete: remove,
};

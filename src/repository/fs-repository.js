const { throws } = require("assert");
const { timeStamp } = require("console");
const EventEmitter = require("events");
const config = require("../config/fs-repository");
const fs = require("fs");

/**
 * Module to cache data objects in memory and persist to the local filesystem.
 * This implementation provides an example of how to asynchronously wrap and interface with Node's FS API.
 * The code seeks to demonstrate the use of different approaches to asynchronous operation within Node, including the
 * more traditional callback, together with 'modern' ES approaches of promises and async wait.
 * There are deliberate interval delays which print to the console to demonstrate that the event loop is not blocked
 * in relevant scenarios.
 *
 * NOTE: This is a simple implementation to demonstrate using the Node FS API and to facilitate persistent storage of data objects in the absence of
 * a purpose built backend data storage resource service such as Redis, MongDb etc...
 * As a result, this implementation has the following scaling limitations:
 *  1.  Heap memory usage - all data objects are cached as a collection.
 *  2.  Use with Node Clustering and multi-process operation, performance overhead of all instances accessing the same file in the local filesystem.
 */

const idField = "_id";

/**
 * Provides a promise to load a dataset from an existing local file.
 * If there is no file then the promise resolves with an empty dataset.
 * If there is a file but it cannot be loaded, then the promise rejects with the encountered error.
 * @function loadData
 * @param {string} namespace - Unique namespace of the dataset.
 * @returns Promise to load a dataset from an existing file in the local file system
 */
const loadData = (namespace) => {
  return new Promise((resolve, reject) => {
    let file = archiveFile(namespace);
    if (fs.existsSync(file)) {
      fs.readFile(file, (err, fileData) => {
        if (err) {
          // The file exists but there was an OS level error reading it.
          reject(err);
        } else {
          try {
            // successfully loaded file data, attempt to parse the data buffer as JSON.
            resolve(JSON.parse(fileData));
          } catch (parseError) {
            // Badly formed JSON, return the error
            reject(parseError);
          }
        }
      });
    } else {
      // No archive file, return an empty dataset
      resolve({});
    }
  });
};

/**
 * Cache the dataset stored for the specified namespace.
 * @param {string} namespace - Unique namespace of the dataset.
 * @returns
 */
const getDataset = async (namespace, callback) => {
  try {
    let dataset = await loadData(namespace);
    callback(dataset);
  } catch (err) {
    console.log(`Failed to load archived dataset: ${err}`);
    console.log("Loading with an empty dataset!");
    callback(dataset);
  }
};

/**
 * Provide the cached dataset object to the specified callback function.
 * The callback receives an error object if the dataset is still initialising.
 * @function list
 * @param {string} namespace - Unique namespace of the dataset.
 * @param {function(Error,object):void} callback - Synchronous callback
 */
const list = (namespace, callback) => {
  getDataset(namespace, (dataset) => callback(null, Object.values(dataset)));
};

/**
 * Create a dataset entry from the specified data object.  The object will be given a
 * unique id property and inserted into the dataset.  The complete dataset will then be
 * persisted to a file in the local file system.
 * @function create
 * @param {string} namespace - Unique namespace of the dataset.
 * @param {object} data - Data to be added to the dataset
 * @param {function(Error,object):void} callback - Asynchronous callback to signal when the operation completes.
 */
const create = (namespace, data, callback) => {
  getDataset(namespace, (dataset) => {
    let idCursor = parseInt(
      Object.keys(dataset).reduce((acc, cur) => {
        if (cur > acc) {
          acc = cur;
        }
        return acc;
      }, "0")
    );
    insert(namespace, dataset, ++idCursor, data, (err, created) =>
      callback(err, idCursor)
    );
  });
};

/**
 * Update the specified identifier with the specified data object within the
 * specified namespace dataset.
 *
 * @param {string} namespace - Unique namespace of the dataset.
 * @param {string} id - Specified data identifier
 * @param {object} data - Specified data object
 * @param {function(Error,object):void} callback - Callback with operation result.
 */
const update = (namespace, id, data, callback) => {
  getDataset(namespace, (dataset) =>
    insert(namespace, dataset, id, data, callback)
  );
};

/**
 * Insert the specified data object into the dataset against the specified data identifier
 * @function insert
 * @param {string} namespace - Unique namespace of the dataset.
 * @param {object} dataset - Cached dataset for namespace
 * @param {string} id - Specified data identifier
 * @param {object} data - Specified data object
 * @param {function(Error,object):void} callback - Callback with operation result.
 */
const insert = (namespace, dataset, id, data, callback) => {
  let created = dataset.hasOwnProperty(id) == false;
  // Add the id to the data object, this provides exposure of the id to the calling client module.
  data[idField] = id;
  dataset[id] = data;

  // Save is async wait method, so this is an asynchronous save which doesn't block the event loop.
  save(namespace, dataset, (saveErr) => callback(saveErr, created));
};

/**
 * Perform an asynchronous save operation, persisting cached dataset to a file in the local file system.
 * This is an example of an async wait approach to untilise a promise.
 * @param {string} namespace - Unique namespace of the dataset.
 * @param {object} dataset - Cached dataset for namespace
 * @param {function(Error):void} callback - Callback with operation result.
 */
const save = async (namespace, dataset, callback) => {
  // Function which returns a promise
  const saveFile = () => {
    return new Promise((resolve, reject) => {
      fs.writeFile(
        archiveFile(namespace),
        JSON.stringify(dataset),
        (err, data) => {
          if (err) {
            reject(err);
          } else {
            // Simulate async save delay, this is just to demonstrate that event loop is not blocked.
            setTimeout(() => {
              resolve(data);
            }, Math.random() * 1000);
          }
        }
      );
    });
  };

  try {
    // Wait for promise - This doesn't block the event loop
    console.log("Saving dataset");
    let intervalId = setInterval(() => {
      // Output directly to process output, this is to differentiate progress feedback to
      // service state we want to push as log output.
      process.stdout.write("* ");
    }, 100);
    await saveFile();
    console.log("Save successful");
    clearInterval(intervalId);
    callback(null);
  } catch (err) {
    console.log(`Save failed with error: ${err}`);
    callback(err);
  }
};

/**
 * Determine whether specified data identifier exists in the cached dataset.
 * @function remove
 * @param {string} namespace - Unique namespace of the dataset.
 * @param {string} dataId - Specified data identifier
 * @param {function(Error,object):void} callback - Asynchronous callback when operation completes
 */
const remove = (namespace, dataId, callback) => {
  getDataset(namespace, (dataset) => {
    if (dataId in dataset) {
      // cache a function scope copy of the data object (in-case we need to restore it)
      let data = dataset.dataId;
      delete dataset[dataId];

      // Asynchronous attempt to persist the new dataset cache with the removed data object.
      save(namespace, dataset, (err) => {
        callback(err, !err ? true : false);
      });
    } else {
      callback(null, false);
    }
  });
};

/**
 * Resolves the specified namespace into a physical file within the local filesystem.
 * @param {string} namespace - unique name for the dataset
 * @returns archive file
 */
const archiveFile = (namespace) => {
  let path =
    config.location == "default" ? `/${__dirname}/../../data` : config.location;

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }

  return `${path}/${namespace}.json`;
};

module.exports = {
  // Export CRUD operations
  create: create,
  read: list,
  update: update,
  delete: remove,
};

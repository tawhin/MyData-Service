const { throws } = require("assert");
const { timeStamp } = require("console");
const EventEmitter = require("events");
const fs = require("fs");

/**
 * Object to cache data objects in memory and persist to the local filesystem.
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
class DatasetFsArchive extends EventEmitter {
  /**
   * Represented an archive to persist data objects to the local filesystem.
   * @constructor
   */
  constructor() {
    super();
    // Archive the tasks in a file relative to the module;
    this.archiveFile = __dirname + "/data.json";
    this.ready = false;
    this.init({});

    // Handle our own ready event, we can then start to process task CRUD operations.
    this.on("ready", () => {
      this.ready = true;
    });

    // Example of using a promise
    this.loadData()
      .then((dataset) => {
        this.init(dataset);
        this.emit("ready");
      })
      .catch((error) => {
        console.log(`Failed to load archived tasks: ${error}`);
        console.log("Loading with an empty dataset!");
        // We have completed an attempt to load data which produced an error.
        // Accept that the archive is ready to operate with an empty dataset.
        this.emit("ready");
      });
  }

  /**
   * Initialises the internal cache with the specified dataset object.
   * @function init
   * @param {object} dataset - Collection of objects to initialise the cache with.
   */
  init(dataset) {
    this.dataset = dataset;
    dataset;
    // Get the highest id currently used within the provided dataset, or default to zero.
    // Performed using the JS array reduce function
    this.idCursor = parseInt(
      Object.keys(this.dataset).reduce((acc, cur) => {
        if (cur > acc) {
          acc = cur;
        }
        return acc;
      }, "0")
    );
  }

  /**
   * Provides a promise to load a dataset from an existing local file.
   * If there is no file then the promise resolves with an empty dataset.
   * If there is a file but it cannot be loaded, then the promise rejects with the encountered error.
   * @function loadData
   * @returns Promise to load a dataset from an existing file in the local file system
   */
  loadData() {
    return new Promise((resolve, reject) => {
      if (fs.existsSync(this.archiveFile)) {
        fs.readFile(this.archiveFile, (err, fileData) => {
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
  }

  /**
   * Determines whether the archiver instance has completed an attempt to load an archived dataset.
   * @function isReady
   * @param {function(Error):void} callback - Synchronous callback
   * @returns If the dataset has been loaded, then return null, otherwise return Error
   */
  isReady(callback) {
    if (!this.ready) {
      callback(new Error("Dataset still loading!"));
    }

    return this.ready;
  }

  /**
   * Provide the cached dataset object to the specified callback function.
   * The callback receives an error object if the dataset is still initialising.
   * @function list
   * @param {function(Error,object):void} callback - Synchronous callback
   */
  list(callback) {
    if (this.isReady(callback)) {
      callback(null, this.dataset);
    }
  }

  /**
   * Create a dataset entry from the specified data object.  The object will be given a
   * unique id property and inserted into the dataset.  The complete dataset will then be
   * persisted to a file in the local file system.
   * @function create
   * @param {object} data - Data to be added to the dataset
   * @param {function(Error,object):void} callback - Asynchronous callback to signal when the operation completes.
   */
  create(data, callback) {
    this.insert(++this.idCursor, data, callback);
  }

  /**
   * Insert the specified data object into the dataset against the specified data identifier
   * @function insert
   * @param {string} id - Specified data identifier
   * @param {object} data - Specified data object
   * @param {function(Error,object):void} callback - Callback with operation result.
   */
  insert(id, data, callback) {
    if (this.isReady(callback)) {
      // Add the id to the data object, this provides exposure of the id to the calling client module.
      data["id"] = id;
      this.dataset[data.id] = data;

      // Ensure the idCursor property is set to the highest id in the dataset.
      // This can happen if the insert is called directly from the client with a higher identifier value than
      // any cached dataset object.
      this.idCursor = id > this.idCursor ? id : this.idCursor;

      // Save is async wait method, so this is an asynchronous save which doesn't block the event loop.
      this.save((saveErr) => callback(saveErr, data));
    }
  }

  /**
   * Performs an asynchronous save operation using the async await approach.
   * Saves the complete dataset cache into a file in the local file system.
   * @function save
   * @param {function(Error,object):void} callback - Asynchronous callback to signal when the operation completes.
   */
  async save(callback) {
    // Function which returns a promise
    const saveFile = () => {
      return new Promise((resolve, reject) => {
        fs.writeFile(
          this.archiveFile,
          JSON.stringify(this.dataset),
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
  }

  /**
   * Determine whether specified data identifier exists in the cached dataset.
   * @function delete
   * @param {string} dataId - Specified data identifier
   * @param {function(Error,object):void} callback - Asynchronous callback when operation completes
   */
  delete(dataId, callback) {
    if (this.isReady(callback)) {
      // Initialise status object to not deleted until operation completed successfully.
      let status = {
        deleted: false,
      };

      if (dataId in this.dataset) {
        // cache a function scope copy of the data object (in-case we need to restore it)
        let data = this.dataset.dataId;
        delete this.dataset[dataId];

        // Asynchronous attempt to persist the new dataset cache with the removed data object.
        this.save((err) => {
          if (err) {
            // restore the removed data object back into the cache.
            this.dataset[dataId] = data;
          } else {
            // successfully deleted within the archive file, confirm this in the status.
            status.deleted = true;
          }
          callback(err, status);
        });
      } else {
        // Synchronous status return.
        callback(null, status);
      }
    }
  }
}

module.exports = () => {
  return new DatasetFsArchive();
};

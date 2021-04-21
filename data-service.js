const express = require("express");

const server = express();

const dataIdParam = "dataId";
class DataService {
  /**
   * Construct a web data service instance.
   * @constructor
   * @param {object} archiver - Providing the expected methods to access dataset objects.
   */
  constructor(archiver) {
    this.webServer = express();

    this.webServer.use(express.json()); // for parsing application/json
    this.archiver = archiver;

    /* vv Register Express route handlers vv */

    // Set our CORS policy for any origin (dev only)
    this.webServer.use((req, res, next) => {
      res.append("Access-Control-Allow-Origin", "*");
      res.append("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      res.append(
        "Access-Control-Allow-Headers",
        "content-type,access-control-allow-origin"
      );
      next();
    });

    this.webServer.get("/dataset", (req, res) => this.getDataset(res));

    // We use post here as we only know the url of the factory which will create the task (rather than url of the specific task to create.)
    this.webServer.post("/data", (req, res) => this.postData(req, res));

    // Using put here to enforce idempotency, this will either create or update the data object with the specified
    // data identifier.
    this.webServer.put(`/data/:${dataIdParam}`, (req, res) =>
      this.putData(req, res)
    );

    // Explicitly address a data object resource to delete
    this.webServer.delete(`/data/:${dataIdParam}`, (req, res) =>
      this.deleteData(req, res)
    );
  }

  /**
   * Process a request to get all data and response using the specified Express response instance.
   * @function getDataset
   * @param {object} res - Express response object instance
   */
  getDataset(res) {
    console.log("Getting all data objects...");
    this.archiver.list((err, dataset) => this.response(err, res, dataset));
  }

  /**
   * Verifies whether the content type of the specified Express request is set to JSON.
   * @function verifyJsonRequest
   * @param {Request} req - Express request object instance
   * @param {Response} res - Express response object instance
   * @returns True if request contains a JSON content type, otherwise False
   */
  verifyJsonRequest(req, res) {
    if (!req.is("json")) {
      res.status(400).send("Expecting JSON content type");
      return false;
    }

    return true;
  }

  /**
   * Adds a new data object specified within the Express request instance.
   * @function postData
   * @param {Request} req - Express request object instance
   * @param {Response} res - Express response object instance
   */
  postData(req, res) {
    if (this.verifyJsonRequest(req, res)) {
      // request is of the expected type 'application/json'
      console.log("Creating new data object...");
      this.archiver.create(req.body, (err, data) =>
        this.response(err, res, data)
      );
    }
  }

  /**
   * Create or update an addressed data object with the specified Express object request.
   * @function putData
   * @param {Request} req - Express request object instance
   * @param {Response} res - Express response object instance
   */
  putData(req, res) {
    if (this.verifyJsonRequest(req, res)) {
      console.log("Updating the dataset...");
      this.archiver.insert(req.params[dataIdParam], req.body, (err, data) =>
        this.response(err, res, data)
      );
    }
  }

  /**
   * Process an Express routed request to delete a data object
   * @function deleteData
   * @param {Request} req - Express request object instance
   * @param {Response} res - Express response object instance
   */
  deleteData(req, res) {
    let dataId = req.params[dataIdParam];
    console.log(`Delete data object with id:${dataId}`);
    // Note the check is performed synchronously here
    this.archiver.delete(dataId, (err, status) => {
      if (err) {
        // There has been an error whilst attempting to delete the data.
        res.sendStatus(500);
      } else {
        // If the status.deleted is false then the specified data id was not found.
        res.sendStatus(status.deleted ? 200 : 404);
      }
    });
  }

  /**
   * Utilise the specified Express response instance to send a 'application/json' response back to the client.
   * @function response
   * @param {Error} err - Error instances generated when processing the Express request object
   * @param {Response} res - Express response object instance
   * @param {Object} json - Data to insert
   */
  response(err, res, json) {
    //res.append("Access-Control-Allow-Origin", "*");
    if (err) {
      // Sets the http status code to 500 and returns "Internal server error" within the response body
      res.sendStatus(500);
    } else {
      // Sends a JSON response, with the correct content type (application/json).
      // The object parameter is converted to a JSON string using JSON.stringify()
      res.json(json);
    }
  }

  /**
   * Start the data web service on the specified port.
   * @function start
   * @param {number} port - Specified service port
   */
  start(port) {
    this.webServer.listen(port, () => {
      console.log(`MyData service instance is running on port ${port}.....`);
    });
  }
}

module.exports = (dataStore) => {
  return new DataService(dataStore);
};

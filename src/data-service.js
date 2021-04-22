const express = require("express");

const dataIdParam = "dataId";
const namespaceParam = "namespace";

const webServer = express();
webServer.use(express.json()); // for parsing application/json
/* vv Register Express route handlers vv */

webServer.get(`/:${namespaceParam}/dataset`, (req, res) =>
  getDataset(req, res)
);

// We use post here as we only know the url of the factory which will create the task (rather than url of the specific task to create.)
webServer.post(`/:${namespaceParam}/data`, (req, res) => postData(req, res));

// Using put here to enforce idempotency, this will either create or update the data object with the specified
// data identifier.
webServer.put(`/:${namespaceParam}/data/:${dataIdParam}`, (req, res) =>
  putData(req, res)
);

// Explicitly address a data object resource to delete
webServer.delete(`/:${namespaceParam}/data/:${dataIdParam}`, (req, res) =>
  deleteData(req, res)
);

let archiver = null;

/**
 * Process a request to get all data and response using the specified Express response instance.
 * @function getDataset
 * @param {Request} req - Express request object instance
 * @param {Response} res - Express response object instance
 */
const getDataset = (req, res) => {
  console.log(`Getting all data objects ${req.params[namespaceParam]}...`);
  archiver.read(req.params[namespaceParam], (err, dataset) =>
    response(err, dataset, res)
  );
};

/**
 * Verifies whether the content type of the specified Express request is set to JSON.
 * @function verifyJsonRequest
 * @param {Request} req - Express request object instance
 * @param {Response} res - Express response object instance
 * @returns True if request contains a JSON content type, otherwise False
 */
const verifyJsonRequest = (req, res) => {
  if (!req.is("json")) {
    res.status(400).send("Expecting JSON content type");
    return false;
  }

  return true;
};

/**
 * Adds a new data object specified within the Express request instance.
 * @function postData
 * @param {Request} req - Express request object instance
 * @param {Response} res - Express response object instance
 */
const postData = (req, res) => {
  if (verifyJsonRequest(req, res)) {
    // request is of the expected type 'application/json'
    console.log(
      `Creating new data object within dataset ${req.params[namespaceParam]}...`
    );
    archiver.create(req.params[namespaceParam], req.body, (err, data) =>
      response(err, data, res)
    );
  }
};

/**
 * Create or update an addressed data object with the specified Express object request.
 * @function putData
 * @param {Request} req - Express request object instance
 * @param {Response} res - Express response object instance
 */
const putData = (req, res) => {
  if (verifyJsonRequest(req, res)) {
    console.log(`Updating the ${req.params[namespaceParam]} dataset...`);
    archiver.update(
      req.params[namespaceParam],
      req.params[dataIdParam],
      req.body,
      (err, data) => response(err, data, res)
    );
  }
};

/**
 * Process an Express routed request to delete a data object
 * @function deleteData
 * @param {Request} req - Express request object instance
 * @param {Response} res - Express response object instance
 */
const deleteData = (req, res) => {
  console.log(
    `Delete data object with id:${req.params[dataIdParam]} in dataset ${req.params[namespaceParam]}`
  );
  // Note the check is performed synchronously here
  archiver.delete(
    req.params[namespaceParam],
    req.params[dataIdParam],
    (err, status) => {
      if (err) {
        // There has been an error whilst attempting to delete the data.
        res.sendStatus(500);
      } else {
        // If the status.deleted is false then the specified data id was not found.
        res.sendStatus(status.deleted ? 200 : 404);
      }
    }
  );
};

/**
 * Utilise the specified Express response instance to send a 'application/json' response back to the client.
 * @function response
 * @param {Error} err - Error instances generated when processing the Express request object
 * @param {Request} req - Express request object instance
 * @param {Response} res - Express response object instance
 */
const response = (err, data, res) => {
  if (err) {
    // Sets the http status code to 500 and returns "Internal server error" within the response body
    res.sendStatus(500);
  } else {
    // Sends a JSON response, with the correct content type (application/json).
    // The object parameter is converted to a JSON string using JSON.stringify()
    res.json(data);
  }
};

/**
 * Start the data web service on the specified port.
 * @function start
 * @param {object} useArchive - Archive object to use for persistence storage
 * @param {number} port - Specified service port
 */
module.exports.start = (port, useArchiver) => {
  archiver = useArchiver;
  webServer.listen(port, () => {
    console.log(`MyData service instance is running on port ${port}.....`);
  });
};

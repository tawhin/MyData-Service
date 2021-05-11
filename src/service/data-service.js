const serverConfig = require("../config/server");
const mongoConfig = require("../config/mongo-repository")
const e = require("express");
const express = require("express");
const fs = require("fs");

const dataIdParam = "dataId";
const namespaceParam = "namespace";
const configParam = "config";

const webServer = express();
webServer.use(express.json()); // for parsing application/json
/* vv Register Express route handlers vv */

webServer.use((req, res, next) => {
  res.append("Access-Control-Allow-Origin", "*");
  res.append("Access-Control-Allow-Methods", serverConfig.getCors());
  res.append(
    "Access-Control-Allow-Headers",
    "content-type,access-control-allow-origin"
  );
  next();
});

webServer.get('/config', (req,res) => {
    response(null, {...serverConfig,...mongoConfig}, res);
});

webServer.get(`/etc/config/:${configParam}`, (req,res) => {
  fs.readFile(`${serverConfig.configPath}/${req.params[configParam]}`, 'UTF8', (err, fileData) => {
    if(err) {
      response(err, null, res);
    }
    else {
      var config = {};
      config[req.params[configParam]] = fileData.split(',');
      response(null, config, res);
    }
  })  
});

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

let repository = null;

/**
 * Process a request to get all data and response using the specified Express response instance.
 * @function getDataset
 * @param {Request} req - Express request object instance
 * @param {Response} res - Express response object instanc
 */
const getDataset = (req, res) => {
  console.log(`Getting all data objects ${req.params[namespaceParam]}...`);
  repository.read(req.params[namespaceParam], (err, dataset) =>
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
    repository.create(
      req.params[namespaceParam],
      req.body,
      (err, identifier) => {
        if (err) {
          res.status(500).send(err.message);
        } else {
          // We have created the resource, add the Location URI header.
          res.append(
            "Location",
            `http://${serverConfig.host}/data/${identifier}`
          );
          // Status is 201 (Created)
          res.sendStatus(201);
        }
      }
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
    repository.update(
      req.params[namespaceParam],
      req.params[dataIdParam],
      req.body,
      (err, created) => {
        if (err) {
          res.status(500).send(err.message);
        } else {
          // In accordance with the HTTP Put spec, return 201 (Created) or 200 (modified)
          res.sendStatus(created ? 201 : 200);
        }
      }
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
  repository.delete(
    req.params[namespaceParam],
    req.params[dataIdParam],
    (err, deleted) => {
      if (err) {
        res.status(500).send(err.message);
      } else if (!deleted) {
        // If deleted is false without an error, then the specified data id was not found.
        res.status(404).send(`Object '${req.params[dataIdParam]}' not found`);
      } else {
        res.sendStatus(200);
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
    // Sets the http status code to 500 and returns the error message within the response body
    res.statusText = err.message;
    res.status(500).send(err.message);
  } else {
    // Sends a JSON response, with the correct content type (application/json).
    // The object parameter is converted to a JSON string using JSON.stringify()
    res.json(data);
  }
};

/**
 * Start the data web service on the specified port.
 * @function start
 * @param {object} useRepository - Repository object to use for persistence storage
 * @param {number} port - Specified service port
 */
module.exports.start = (useRepository) => {
  repository = useRepository;
  webServer.listen(serverConfig.port, () => {
    console.log(
      `MyData service instance is running on port ${serverConfig.port}.....`
    );
  });
};

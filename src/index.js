const serverConfig = require("../config/server");
const repository = require(`./${serverConfig.repository}`);
const dataService = require("./data-service");

/*
 * Use an Index.js to control how we launch web service.
 * This gives us the ability to accept and process args (i.e. port, archiver type etc..)
 * Additionally, we could leverage the Node cluster mechanism to launch a web service process for each available CPU core on the host.
 * Watch this space for an implementation example...
 */

dataService.start(repository);

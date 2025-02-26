const serverConfig = require("./config/server");
const repository = require(`./repository/${serverConfig.repository}`);
const repositoryConfig = require(`./config/${serverConfig.repository}`);
const dataService = require("./service/data-service");

/*
 * Use an Index.js to control how we launch web service.
 * This gives us the ability to accept and process args (i.e. port, archiver type etc..)
 * Additionally, we could leverage the Node cluster mechanism to launch a web service process for each available CPU core on the host.
 * Watch this space for an implementation example...
 */
console.log(
  `Server starting, connecting to repository: ${serverConfig.repository}, location: ${repositoryConfig.location}`
);
dataService.start(repository);

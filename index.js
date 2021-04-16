const fsArchiver = require('./fs-data-archive');
const dataService = require('./data-service')(fsArchiver());

/*
 * Use an Index.js to control how we launch web service.  
 * This give us the ability to accept and process args (i.e. port, archiver type etc..)
 * Additional, we could leverage the Node cluster mechanism to launch a web service process for each available CPU core on the host. 
 * Watch this space for an implementation example...
 */ 

dataService.start(4242);
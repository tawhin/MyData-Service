const { MongoClient } = require("mongodb");
const config = require("../config/mongodb");

const connect = async () => {
  try {
    const client = new MongoClient(config.url);
    await client.connect();
    const admin = client.db(config.dbName).admin();
    console.log(await admin.serverStatus());
    console.log(await admin.listDatabases());
  } catch (err) {
    console.log(err);
  }
};

connect();

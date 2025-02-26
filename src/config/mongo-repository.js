module.exports = {
  location: `mongodb://${process.env.MONGO_HOST || "localhost"}:${
    process.env.MONGO_PORT || "27017"
  }`,
  dbName: process.env.DB_NAME || "MyData",
};

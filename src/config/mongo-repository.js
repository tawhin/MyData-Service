module.exports = {
  location: `mongodb://${process.env.MONGO_URL || "localhost:27017"}`,
  dbName: process.env.DB_NAME || "MyData",
};

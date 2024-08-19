const { MongoClient } = require("mongodb");

const url = process.env.DB_URL;

function connectDB() {
  return new MongoClient(url).connect();
}

module.exports = connectDB;
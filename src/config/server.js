
const fs = require("fs");

const configPath = process.env.CONFIG_PATH || "/etc/config";

const corsConfig = () => {
  const corsPath = `${configPath}/cors`;
  if(fs.existsSync(corsPath)) {
    return fs.readFileSync(corsPath, 'UTF8');
  }

  return "GET,POST,PUT,DELETE";
}

module.exports = {
  repository: process.env.REPOSITORY || "mongo-repository",
  host: process.env.HOST || "localhost",
  port: process.env.PORT || 4242,
  configPath: configPath,
  getCors: corsConfig
};

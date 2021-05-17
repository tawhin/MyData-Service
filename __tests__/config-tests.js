

describe("Test service configuration modules", () => {

    const LOADED_ENV = process.env;

    beforeEach(() =>{
        jest.resetModules();
    });

    afterAll(() =>{
        process.env = LOADED_ENV;
    });
    
    test("Test filesystem repository default config", () => {
        delete process.env.FS_LOCATION;
        const fsConfig = require("../src/config/fs-repository");

        expect(fsConfig.location).toEqual("default");
    });

    test("Test filesystem repository from loaded config", () => {
        const expected = "my/explicit/location";
        process.env.FS_LOCATION = expected;
        const fsConfig = require("../src/config/fs-repository");

        expect(fsConfig.location).toEqual(expected);
    });

    verifyMongoConfig = (location,dbName) => {
        const mongoConfig = require("../src/config/mongo-repository");
        expect(mongoConfig.location).toEqual(location);
        expect(mongoConfig.dbName).toEqual(dbName);
    }

    test("Test MongoDb repository default config", () => {
        delete process.env.MONGO_HOST;
        delete process.env.MONGO_PORT;
        delete process.env.DB_NAME;

        verifyMongoConfig("mongodb://localhost:27017", "MyData");
    });

    test("Test MongoDb repository loaded config", () => {
        const expectedHost = "myMongoDbHost";
        const expectedPort = "1111";
        const expectedDb = "TestDb";

        process.env.MONGO_HOST = expectedHost;
        process.env.MONGO_PORT = expectedPort;
        process.env.DB_NAME = expectedDb;

        verifyMongoConfig(`mongodb://${expectedHost}:${expectedPort}`, expectedDb);
    });

    verifyServerConfig = (repository,configPath,host,port,cors) => {
        const serverConfig = require("../src/config/server");
        expect(serverConfig.repository).toEqual(repository);
        expect(serverConfig.configPath).toEqual(configPath);
        expect(serverConfig.host).toEqual(host);
        expect(serverConfig.port).toEqual(port);
        expect(serverConfig.getCors()).toEqual(cors);
    }

    test("Test server defaults", () => {
        delete process.env.REPOSITORY;
        delete process.env.HOST;
        delete process.env.PORT;
        delete process.env.CONFIG_PATH;

        verifyServerConfig("mongo-repository", "/etc/config", "localhost", 4242, "GET,POST,PUT,DELETE");
    });

    test("Test server loaded config", () => {
        const expectedRepo = "fs-repository";
        const expectedHost = "myTestHost";
        const expectedPort = "4243";
        const expectedConfigPath = `/${__dirname}`;

        process.env.REPOSITORY = expectedRepo
        process.env.HOST = expectedHost;
        process.env.PORT = expectedPort;
        process.env.CONFIG_PATH = expectedConfigPath;

        verifyServerConfig(expectedRepo,expectedConfigPath,expectedHost,expectedPort, "DELETE,POST,GET");
    });
});
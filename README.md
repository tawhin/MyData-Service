# MyData-Service

The implementation offers an example coding reference to supplement up skilling activities within Node.JS, Express and MongoDB.
This service leverages the Node Express framework to provide a REST API for CRUD operations for Javascript objects within the context of namespace.
A namespace provides a ring fenced dataset for a collection of objects.

## Project

Developed using Node v10.19.0

## Run

`npm i`

`npm run dev:start` _Use nodemon to run the service using the configuration fields detailed below_

`npm start` _Runs the service directly in node_

## Configuration

**_Main Server:_**

The service loads configuration from the following environment variables set in the host:

- REPOSITORY: _Configure the service to integrate either the local filesystem or MongoDB to provide a persistent storage repository_
  - Options: `fs-repository` or `mongo-repository`
- HOST: _Set the hostname for the service_
  - Options: `FQDN` or `localhost`
- Post: _Set the listening port for the service_

</br>
The following module wraps the environment variable settings and provides a default value in the absence of specified environment variables:

`/src/config/server.js`</br>
Defaults:

- REPOSITORY: `mongo-repository`
- HOST: `localhost`
- PORT: 4242

**_MongoDB Repository:_**

The service loads configuration from the following environment variables set in the host:

- MONGO\_HOST: _Configure host FQDN or local host name for the MongoDB server_
- MONGO\_PORT: _Configure the port the MongoDB server is listening on_
- DB\_NAME: _Configure the MongoDB database name to use_

</br>
The following module wraps the environment variable settings and provides a default value in the absence of specified environment variables:

`/src/config/mongodb.js`</br>
Defaults:

- MONGO\_HOST: `localhost`
- MONGO\_PORT: `27017`
- DB\_NAME: `MyData`

**_File System Repository_**

The service loads configuration from the following environment variables set in the host:

- LOCATION: _Set local filesystem output path to store repository files_

</br>
The following module wraps the environment variable settings and provides a default value in the absence of specified environment variables:

`/src/config/fs-data.js`</br>
Defaults:

- LOCATION: `default`
  - Places the path within `/services/MyDataService/data/`

## REST API

- Create Object:

  - Request:
    - Command: PUSH
    - URL: `http://<host>:<port>/<namespace>/data`
    - Headers:
      - content-type: `application/json`
    - Body: _JSON of object to create_
  - Response:
    - Status: 201
    - Headers:
      - content-type: `text/plain; charset=utf-8`
      - location: _URL to created resource, this will include the unqiue resource identifier created for the object_

- Read _All Objects_:

  - Request:
    - Command: GET
      - URL: `http://<host>:<port>/<namespace>/dataset`
  - Response:
    - Status: 200
    - Headers:
      - content-type: `application/json`
    - Body: _JSON arrays of all objects in the namespace_

- Update Object:

  - Request:
    - Command: PUT
      - URL: `http://<host>:<port>/<namespace>/data/<identifier>`
    - Headers:
      - content-type: `application/json`
    - Body: _JSON of object fields to update_
  - Response:
    - Status:
      - 200 Object identifer exists, located and updated successfully.
      - 201 Object created successfully with provided identifier.
    - Headers:
      - content-type: `text/plain; charset=utf-8`

- Delete Object:
  - Request:
    - Command: DELETE
    - URL: `http://<host>:<port>/<namespace>/data/<identifier>`
  - Response:
    - Status:
      - 200 Object identifier found and successfully deleted.
      - 404 Object identifier not found
    - Headers:
      - content-type: `text/plain; charset=utf-8`

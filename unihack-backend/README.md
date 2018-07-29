# Unihack Backend

__Start server__
```bash
npm run server
```
Requires mongodb running somewhere.

Docs are available at http://localhost:3000 after starting server.

__Run Example MQTT Publisher__
```bash
npm run example:publisher -- -help
```

__Run Example MQTT Subscriber__
```bash
npm run example:subscriber -- -help
```

__Run Example Device__
```bash
npm run example:device -- -help
```

## Configuration
A config.json file is provided in the repo. This can be updated for specific deployment configurations.

```js
{
  /* MQTT Broker Config */
  "mqtt": {
    // url of MQTT Broker. Generally should be localhost
    // Used by internal MQTT client to monitor topics for incoming device messages and sending commands
    "host": "localhost",
    // MQTT Port to listen on
    // Used by MQTT Server to set what port to listen on
    // Used by MQTT Client to set what port to connect to
    "port": 1883,
    // Username to be provided by users connecting via MQTT
    "username": "admin",
    // Password to be used when connecting via MQTT
    "password": "somepassword"
  },
  /* HTTP API configuration settings*/
  "api": {
    // Port for HTTP API to listen on
    "port": 8080
  },
  /* Mongo DB configuration settings */
  "mongodb": {
    // Mongo DB Uri -- Overrides host and port options
    "uri": "mongodb://username:password@localhost:27017/some-database",
    // Hostname of mongo db instance
    "host": "localhost",
    // Port mongo db instance is using
    "port": "27017",
    // Database to use for application
    "database": "some-database",
    // Extra options to be passed to MongoClient
    // See: http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html
    "options": {}
  }
}

```
## Database
A docker-compose file is provided in the mongo directory for starting a docker container to run a mongo db instance. 

## Author
Tyler Goodwin - [Email](fixed-term.tyler.goodwin@au.bosch.com)

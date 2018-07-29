/*
*  dbAdapter.js
*  Database connector for persistence
*  Handles connection and database operations.
*  Author: Tyler Goodwin
*/
"use-strict";
const MongoClient = require('mongodb').MongoClient;

const Auth = require('./auth');
/*
* Connects a new database adapter.
* @param database - string containing database name to use
* @param callback - function to call once database connection has been established
*                   databaseAdapter is passed to the callback
*/
function DbAdapter(config, connectionCallback){
  const url = config.uri || `mongodb://${config.host}:${config.port}`;

  const DEVICE_COLLECTION = 'devices';
  const QUEUE_LENGTH = 10000;

  console.log("[DB]\tCreating Database with config:");
  console.log(JSON.stringify(config));

  // Client to be returned
  var client = {};
  // Database connection pool
  var db;
  // Extra database connection options
  const options = Object.assign({useNewUrlParser: true }, config.options);

  /**
  *  Calls the callback passing the bool as to whether or not the given device exists
  *  @param deviceId - device to check existence of
  *  @param callback - callback to recieve result
  */
  client.checkExists = function(deviceId, callback){
    db.collection(DEVICE_COLLECTION)
      .find({_id: deviceId})
      .limit(1)
      .hasNext(callback);
  }

  /**
  *  Retrieves the given device
  *  @param deviceId -- id of the device to retrieve
  *  @return device object
  */
  client.get = function(deviceId, callback){
    db.collection(DEVICE_COLLECTION)
      .findOne({_id: deviceId}, { projection: {config: 1, status: 1} }, callback);
  }

  /**
  * Returns all devices
  * @param queryArr - Array of device id's to show
  * @param page - which page of results do you want
  * @param page_size - max number of results to return size
  */
  client.all = function(queryArr, page, page_size, callback){
    query = {};
    if(queryArr) query._id = { $in: queryArr };

    return db.collection(DEVICE_COLLECTION)
      .find(query)
      .project({config: 1, status: 1})
      .skip(page_size * (page))
      .limit(page_size).toArray(callback);
  }

  /**
  *  Gets the sensor data for the given device
  *  @param deviceId -- id of the device to retrieve data for
  *  @param limit -- limits number of datapoints to the latest given amount
  *  @param callback -- callback(err, result_array)
  */
  client.getSensorData = function(deviceId, limit, query, callback){
    db.collection(`${deviceId}_sensordatapoints`)
      .find(query)
      .sort({timestamp: -1})
      .limit(limit)
      .toArray(callback);
  }

  /**
  *  Gets the paginated sensor data for the given device
  *  @param deviceId -- id of the device to retrieve data for
  *  @param pageSize -- number of datapoints per page
  *  @param page     -- page, starts at 0
  *  @param callback -- callback(err, result_array)
  */
  client.getPaginatedSensorData = function(deviceId, query, pageSize, page, callback){
    query.timestamp["$gte"] = query.timestamp.start;
    query.timestamp["$lte"] = query.timestamp.end;
    delete query.timestamp.start;
    delete query.timestamp.end;

    db.collection(`${deviceId}_sensordatapoints`)
      .find(query)
      .sort({timestamp: -1})
      .skip(pageSize * page)
      .limit(pageSize)
      .toArray(callback);
  }

  /**
  *  Adds the device if it doesn't already exist.
  *  If device is created, callback is called with result of insert method
  *  If device is not created, callback is called with false.
  *  @param deviceId -- id of the device to add
  *  @param callback -- function to call at completion of action
  */
  client.add = function(deviceId, callback){
    client.checkExists(deviceId, (err, result) => {
      if(result) {
        callback(false);
        return;
      }

      const devices = db.collection(DEVICE_COLLECTION);
      let lastTwo = deviceId.slice(deviceId.length-2, deviceId.length);

      const newDevice = {
        _id: deviceId,
        config: {},
        status: {},
        apiKeyDigest: Auth.digest("UNIHACK_Bosch"+lastTwo)
      }

      client.createSensorCollection(deviceId);

      devices.insert(newDevice, (err, insResult) =>{
        if(err) console.error(`[DB Client]\tError adding device: ${err}`);
        else console.log(`[DB Client]\t New device added: ${deviceId}`);
        callback(insResult);
      });
    })
  }

  /**
  * Creates the sensor data collection.
  * This collection is a capped collection, so it behaves like a circular buffer.
  * Once the limit has been reached, the older data values are pushed out.
  * @param deviceId -- id of the device to create collection for
  * @param callback -- function to be called at completion of creation
  */
  client.createSensorCollection = function(deviceId, callback){
    db.createCollection(
      `${deviceId}_sensordatapoints`,
      {capped: true, size: QUEUE_LENGTH * 1000, max: QUEUE_LENGTH},
      (err, results) => {
        if(err) console.error(`[DB Client]\tError creating collection: ${err}`);
        else console.log(`[DB Client]\tCreated sensor store for ${deviceId}`);
        if(callback) callback(results);
      }
    );
  }

  /**
  * Stores the sensor data payloads
  * @param sensorData -- Object containing sensor data payload
  * @param callback -- function to call at completion of action
  */
  client.pushSensorData = function(deviceId, sensorData, callback){
    client.add(deviceId, () => {
      db.collection(`${deviceId}_sensordatapoints`).insert(sensorData, callback);
    });
  }

  /**
  *  Updates the device config
  *  @param deviceId -- id of the device to be updated
  *  @param config -- new config object
  *  @param callback -- OPTIONAL function to be called after update completes
  */
  client.updateConfig = function(deviceId, config, callback){
    client.add(deviceId, () => {
      db.collection(DEVICE_COLLECTION)
        .updateOne(
          { _id: deviceId },
          { $set: { config: config } },
          (err, result) => {
            if(err) console.error(`[DB Client] Error updating config: ${err}`);
            if(callback) callback(result);
          }
        );
    });
  }

  /**
  *  Updates the device status
  *  @param deviceId -- id of the device to be updated
  *  @param status -- new status object
  *  @param callback -- OPTIONAL function to be called after update completes
  */
  client.updateStatus = function(deviceId, status, callback){
    client.add(deviceId, () => {
      db.collection(DEVICE_COLLECTION)
        .updateOne(
          { _id: deviceId },
          { $set: { status: status } },
          (err, result) => {
            if(err) console.error(`[DB Client] Error updating status: ${err}`);
            if(callback) callback(result);
          }
        );
    });
  }

  /**
  *  Returns the api key digest
  *  @param deviceId -- id of the device
  *  @param callback -- callback to receive the api key digest
  */
  client.getApiKeyDigest = function(deviceId, callback){
    db.collection(DEVICE_COLLECTION)
      .findOne(
        {_id: deviceId},
        { projection: {apiKeyDigest: 1} },
        (err, result) => {
          if(err) console.error(`[DB Client] Error retrieving api key digest: ${err}`);
          if(result && result.apiKeyDigest) callback(result.apiKeyDigest);
          else callback(null);
        }
      );
  }

  /**
  *  Updates the api key digest
  *  @param deviceId - device to update api key for
  *  @param apiKey - undigested api key to be added
  *  @param callback - Optional callback
  */
  client.setApiKey = function(deviceId, apiKey, callback){
    client.checkExists(deviceId, (err, result) => {
      if(err){
        console.error(`[DB Client]\tError setting api key: ${err}`);
        return callback(error, false);
      }
      if(!result) return callback({error: "Device not found"}, false);

      db.collection(DEVICE_COLLECTION)
        .updateOne(
          { _id: deviceId },
          { $set: { apiKeyDigest: Auth.digest(apiKey) } },
          (err, result) => {
            if(err) console.error(`[DB Client] Error updating status: ${err}`);
            if(callback) callback(err, result);
          }
        );
    });
  }

  //Connect to database and call connectionCallback with connected client
  MongoClient.connect(url, options, (err, dbClient) =>{
    if(err){
      console.error(`[DB Client]\tConnection Failed! Exiting...`);
      console.error(err);
      process.exit();
    }

    console.log(`[DB Client]\tConnected to ${url}`);
    db = config.database ? dbClient.db(config.database) : dbClient.db();
    connectionCallback(client);
  });
}

module.exports = DbAdapter;

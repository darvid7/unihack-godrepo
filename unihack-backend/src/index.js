/**
 *  index.js
 *  Main entry point for unihack backend app
 *  Author: Tyler Goodwin
 */
const path = require('path');
let config;

const DbAdapter = require('./utils/dbAdapter');
const MqttServer = require('./mqttServer');
const HttpApi = require('./httpApi');
const MqttClient = require('./mqttClient');

const database_name = "unihackdevices";


console.log('\n------------------------------');
console.log('Bosch UNIHACK 2018 Backend');
console.log('------------------------------\n');

if (process.env.NODE_ENV === 'production') {
  config = require(path.resolve(__dirname, '../config.production.json'));

  console.log("[APP]\tRunning in Production Mode");
  //Override config options with Cloud Foundry options
  if (process.env.PORT) {
    config.api.port = process.env.PORT;
  }

  if (process.env.VCAP_SERVICES) {
    const services = JSON.parse(process.env.VCAP_SERVICES);
    // May require update to http ports also
    var service = services[config.mongodb.production.serviceName][0];

    // basic details
    if (service.credentials.database)
      config.mongodb.database = service.credentials.database;
    if (service.credentials.uri)
      config.mongodb.uri = service.credentials.uri;

    // set options
    config.mongodb.options = Object.assign({}, config.mongodb.options);
    if (service.credentials.replicaset)
      config.mongodb.options.replicaSet = service.credentials.replicaset;
  }

  if (process.env.mqttPort) {
    config.mqtt.port = process.env.mqttPort;
  }

  // console.log("[APP]\tFull Environment:");
  // console.log(JSON.stringify(process.env));
  console.log("[APP]\tApplied final config:");
  console.log(JSON.stringify(config));
} else {
  config = require(path.resolve(__dirname, '../config.json'));
}

//Create device datastore
DbAdapter(config.mongodb, db => {
  // Start Mqtt Broker
  const mqttServer = MqttServer(db, config);
  // Start mqtt client to save received telemetry for http api
  const mqttClient = MqttClient(db, config);
  //Start Http API
  const httpApi = HttpApi(db, mqttClient, config);
});

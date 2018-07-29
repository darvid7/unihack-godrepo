"use-strict";

var firebase = require('firebase');


const config = require("../config.json");
const mqtt = require('mqtt');
const logger = require("./logger");

const PREFIX = "MQTTClient";

var firebase_config = {
    apiKey: "AIzaSyBD7tH8YSUnT44VToikRfJRYej1TTdmfhU",
    authDomain: "mediocre-unihack.firebaseapp.com",
    databaseURL: "https://mediocre-unihack.firebaseio.com",
    projectId: "mediocre-unihack",
    storageBucket: "mediocre-unihack.appspot.com",
    messagingSenderId: "521158343926"
  };

var FIREBASE_APP = firebase.initializeApp(firebase_config);
var BOSCH_FIREBASE = FIREBASE_APP.database().ref("bosch_range_of_motion");
const client = mqtt.connect(`mqtt://${config.mqtt.host}:${config.mqtt.port}`, {
  clientId: config.clientId,
  username: config.mqtt.username,
  password: config.mqtt.password
});


const ROM_TIMEFRAME_MILLISECONDS = 3000; // update every 5 seconds.
var ROM_START_TIME_MILLISECONDS = 0;

function dotProduct(vector3dA, vector3dB) {
    var sum = 0.0;
    for (var i = 0; i < 3; i++) {
      sum = sum + (vector3dA[i] * vector3dB[i]);
    }
    return sum;
}

function vectorMagnnitude(vector3d) {
  return Math.sqrt(vector3d[0] * vector3d[0] + vector3d[1] * vector3d[1] + vector3d[2] * vector3d[2]);
}

var ROM_START = undefined;
var ROM_END = undefined;

class MqttClient {
  constructor() {
    this.connectedAt = null;
    this.connectedSensorTags = {};

    logger.info(`MQTT Client connecting to ${config.mqtt.host}:${config.mqtt.port}`, PREFIX);

    client.on('connect', function() {
      logger.info("MQTT Client connected!", PREFIX);
      this.connectedAt = Date.now();
    })

    client.on('message', (topic, payload) => {
      let data = {};

      // students may push non-JSON
      try {
        data = JSON.parse(Buffer.from(payload).toString('utf8'));
      } catch(e) {
        logger.warn(e);
      }

      logger.info("Recieved " + topic, PREFIX);
      logger.debug("Data Received is " + data, PREFIX);

      if (data.command === 'pushConfig') {
        var deviceID = topic.split("/")[1];
        logger.info(`Recieved pushConfig for ${deviceID}`);
        var tag = this.connectedSensorTags[deviceID];
        if(tag) {
          tag.updateConfig({});
        }
      }
      if (data.command === 'pushStatus') {
        var deviceID = topic.split("/")[1];
        logger.info(`Recieved pushStatus for ${deviceID}`);
        var tag = this.connectedSensorTags[deviceID];
        if(tag) {
          tag.updateStatus({});
        }
      }
      if (data.command === 'updateConfig') {
        var toUpdate = data.body;
        var deviceID = topic.split("/")[1];
        var device = this.connectedSensorTags[deviceID];
        if(device) {
          device.updateConfig(toUpdate);
          // Object.keys(toUpdate).forEach((key) => {
          //   device.services[key].updateConfig(toUpdate[key]);
          // })
        } else {
          logger.warn("Recieved " + topic, PREFIX);
        }
      }
    });
  }

  // static getInstance() {
  //   return instance;
  // }

  pushTelemetry(deviceID, datapoint, data) {
    // console.log(JSON.stringify(data));
    //logger.info(`${deviceID}: DATAPOINT ${datapoint} pushed`, PREFIX);
  //  logger.debug(`${deviceID}: DATAPOINT ${JSON.stringify(data)}`, PREFIX);
    if (datapoint === "movement") {
      logger.info("MOVEMENT YO!", "DLEI@");

      // push to firebase?
      /*
      {"gyro":
      {"x":{"raw":-124,"degPerSecond":-0.946044921875},
      "y":{"raw":38,"degPerSecond":0.2899169921875},
      "z":{"raw":7,"degPerSecond":0.05340576171875}},
      "accel":{"x":{"raw":55,"G":0.013427734375},
      "y":{"raw":28,"G":0.0068359375},
      "z":{"raw":3783,"G":0.923583984375}},
      "mag":{"x":{"raw":-199,"microTesla":-199},
      "y":{"raw":988,"microTesla":988},
      "z":{"raw":-1335,"microTesla":-1335}},"timestamp":1532825899276} \
      */
      var accelX = parseFloat(data["gyro"]["x"]["raw"]);
      var accelY = parseFloat(data["gyro"]["y"]["raw"]);
      var accelZ = parseFloat(data["gyro"]["z"]["raw"]);

      if (ROM_START === undefined) { // fill start.
        ROM_START = [accelX, accelY, accelZ];
        var d = new Date();
        ROM_START_TIME_MILLISECONDS = d.getTime();
        logger.info(`angle degrees CAPTURED START`, "DLEI@");

      } else if (ROM_END === undefined) { // fill end.
        var d2 = new Date();
        if ((d2.getTime() - ROM_START_TIME_MILLISECONDS) > ROM_TIMEFRAME_MILLISECONDS) {
            ROM_END = [accelX, accelY, accelZ];
            logger.info(`angle degrees CAPTURED END`, "DLEI@");

        } else {

          return;
        }
      } else {
        ROM_START = ROM_END;
        ROM_END = [accelX, accelY, accelZ];
        // Calculate dot product here.
        var dotProductValue = dotProduct(ROM_START, ROM_END);
        var startMag = vectorMagnnitude(ROM_START);
        var endMag = vectorMagnnitude(ROM_END);
        var anglePreCos = dotProductValue / (startMag * endMag);
        var angleRadians = Math.acos(anglePreCos);
        var angleDegrees = angleRadians * (180 / Math.PI);
        logger.info(`VECTORS`, "DLEI@");
        logger.info(ROM_START, "DLEI@");
        logger.info(ROM_END, "DLEI@");

        logger.info(`angle degrees: ${angleDegrees}`, "DLEI@");
        var updateMe = {};
        updateMe["bosch_range_of_motion"] = angleDegrees;
        BOSCH_FIREBASE.update(updateMe);

        // reset stuff.
        ROM_START = undefined;
        ROM_END = undefined;
      }



    }
    // client.publish(`telemetry/${deviceID}/${datapoint}`, JSON.stringify(data));
  }

  pushConfig(deviceID, config) {
    var obj = {}
    obj = config;
    delete obj.timestamp;
    obj.timestamp = Date.now();
    logger.info(`${deviceID}: CONFIG pushed`, PREFIX);
    logger.debug(`${deviceID}: CONFIG ${JSON.stringify(obj)}`, PREFIX);

    client.publish(`configuration/${deviceID}`, JSON.stringify(obj));
  }

  pushStatus(deviceID, status) {
    var obj = {}
    obj = status;
    delete obj.timestamp;
    obj.timestamp = Date.now();
    logger.info(`${deviceID}: STATUS pushed`, PREFIX);
    logger.debug(`${deviceID}: STATUS ${JSON.stringify(obj)}`, PREFIX);
    client.publish(`status/${deviceID}`, JSON.stringify(obj));
  }

  subscribeDevice(deviceID) {
    logger.debug(`${deviceID}: SUBSCRIBED`, PREFIX);
    client.subscribe(`commands/${deviceID}`);
  }

  unsubscribeDevice(deviceID) {
    logger.debug(`${deviceID}: UNSUBSCRIBED`, PREFIX);
    client.unsubscribe(`commands/${deviceID}`);
  }
}

const instance = new MqttClient();

module.exports = instance;

const logger = require("./logger");
logger.ascii();

const noble = require("noble");
const axios = require("axios");
const SensorTag = require("./sensortag");
const client = require("./mqttClient");
const config = require("../config.json");

const httpClient = axios.create({
  baseURL: (config.http.https) ? `https://${config.http.host}/` : `http://${config.http.host}:${config.http.port}/`,
  timeout: config.http.timeout,
  auth: {
    username: config.http.username,
    password: config.http.password,
  }
});

/* Config check */
if (!config.sensorTagName && !config.whitelist) {
  logger.error("Please set sensorTagName or whitelist in the config");
  process.exit(1);
}

/* Setup */
noble.startScanning([], false);
setInterval(
  () => {
    logger.debug(`Searching for SensorTags..`);
    noble.stopScanning();
  }, // config.scanInterval
  // Scan every 5 second.
  5000
);
noble.on('scanStop', () => {
  noble.startScanning([], false);
});
noble.on('warning', (e) => {
  logger.warn(e);
})

/* Frees a sensortag and its services */
function free(tag) {
  logger.info("Disconnected " + tag.peripheral.id)

  try {
    if (tag.peripheral.status == "connected")
      tag.peripheral.disconnect();
  } catch (e) {
    logger.error(e);
  }
  tag.freeServices().then(() => {
    if (client.connectedSensorTags[tag.peripheral.id]) {
      logger.debug("Removing SensorTag(" + tag.peripheral.id + ")");
      client.connectedSensorTags[tag.peripheral.id] = null;
    } else {
      logger.warn(tag.peripheral.id + " did not match anything");
    }
  });
}

/* Discovery callback */
noble.on('discover', (peripheral) => {
  try {
    if (!config.sensorTagName || peripheral.advertisement.localName === config.sensorTagName) {
      if (config.whitelist && config.whitelist.indexOf(peripheral.id) < 0) {
        logger.debug(`${peripheral.advertisement.localName} ${peripheral.id} has not been whitelisted`);
        return;
      }

      if (client.connectedSensorTags.length > config.capacity) {
        logger.warn(`${peripheral.id} discovered however gateway is full at capacity`);
        return;
      }

      logger.info("Connnecting to " + peripheral.advertisement.localName + " " + peripheral.id);

      peripheral.connect((e) => {
        if (e) {
          logger.error(e);
          return;
        }
        var status = {
          connection: {
            established: Date.now(),
            terminated: false
          }
        }

        client.subscribeDevice(peripheral.id);
        client.pushStatus(peripheral.id, status);

        peripheral.once('disconnect', () => {
          logger.info(`${peripheral.id} has disconnected`);
          status.connection.terminated = Date.now();
          client.pushStatus(peripheral.id, status);
          client.unsubscribeDevice(peripheral.id);

          if (sensorTag) {
            logger.debug("Freeing sensortag " + sensorTag.id);
            free(sensorTag);
          } else {
            logger.warn("SensorTag is null");
          }
        });

        if (client.connectedSensorTags[peripheral.id]) {
          logger.warn("Duplicate sensortag found, deleting the old one");
          client.connectedSensorTags[peripheral.id].peripheral.disconnect();
        }

        var deviceConfig = Object.assign({}, config.sensorTag.defaultConfig);
        var sensorTag = null;

        httpClient.get(`/devices/${peripheral.id}`).then((res) => {
          deviceConfig = Object.assign(deviceConfig, res.data.config);
          delete deviceConfig.timestamp;
          logger.info("Retrieved and applied remote device config");

        }).catch((e) => {
          logger.error("Failed to GET remote device config, using default configuration defined in gateway");
          logger.error(e);

        }).then(() => {
          sensorTag = new SensorTag(peripheral, deviceConfig);
          logger.info(peripheral.id + " connected");
          sensorTag.status = status;
          client.connectedSensorTags[peripheral.id] = sensorTag;
        })
      });
    }
  } catch (e) {
    logger.error(e);
  }
});

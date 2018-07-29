"use-strict";

const IRATemp = require("./sensors/IRATemp");
const AmbientLight = require("./sensors/AmbientLight");
const Humidity = require("./sensors/Humidity");
const Pressure = require("./sensors/Pressure");
const Movement = require("./sensors/Movement");
const Inputs = require("./sensors/Inputs");
const Outputs = require("./sensors/Outputs");

const logger = require("./logger");
const client = require("./mqttClient");
const discoveryTimeout = require("../config.json").sensorTag.discoveryTimeout;

const NOTIFY_UUID = "2902";
const NOTIFY_NAME = "Client Characteristic Configuration";
const NOTIFY_COUNT = 7;

const BATTERY_READ_INTERVAL = 10000;
const BATTERY_LEVEL_CHAR = "2a19"

class SensorTag {
  constructor(peripheral, config) {
    this.peripheral = peripheral;
    this.id = peripheral.id;
    this.ready = false;
    this.cachedServices = {};
    this.cachedChars = {};
    this.services = {};
    this.status = {};
    this.batteryInterval = null;
    this.currNotifyCount = 0;

    logger.debug(`Received config: ${JSON.stringify(config)}`, this.toString());
    // You cannot take too long to discover services and characteristics
    var timeout = setTimeout(() => {
      logger.error("Timeout on discovering peripheral services, disconnecting...", this.toString());

      peripheral.disconnect();
    }, discoveryTimeout);

    var discovery = peripheral.discoverAllServicesAndCharacteristics((e, services, chars) => {
      if (e) {
        logger.error("Failed to discover services", this.toString());
        logger.debug(e, this.toString());
        peripheral.disconnect();
        return;
      }

      logger.info("Successfully Discovered peripheral services", this.toString());
      clearTimeout(timeout);

      services.forEach((s) => {
        this.cachedServices[s.uuid] = s;
      });

      logger.debug("Discovering descriptors")

      chars.forEach((s) => {
        this.cachedChars[s.uuid] = s;

        s.discoverDescriptors((e, d) => {
          if (e) {
            logger.error(e)
          } else if (d.length > 0 && d[0]) {
            if (d[0].uuid == NOTIFY_UUID && d[0].name == NOTIFY_NAME) {
              d[0].writeValue(Buffer.from([0x01, 0x00]), (e) => {
                if (e) {
                  logger.error("Failed to enable notification in the device", this.toString());
                  peripheral.disconnect();
                } else {
                  this.attemptInitServices(config);
                }
              });
            }
          }
        })
      });
    });

    logger.debug("Instantiated!", this.toString());
  }

  updateBatteryLevel() {
    try {
      this.cachedChars[BATTERY_LEVEL_CHAR].read((e, data) => {
        this.updateStatus({
          "batteryPercent": data.readUInt8()
        });
      });
    } catch(e) {
      logger.error(e);
    }
  }

  attemptInitServices(config) {
    this.currNotifyCount++;
    logger.debug(`notifycount=${this.currNotifyCount}`)

    if (this.currNotifyCount >= NOTIFY_COUNT && Object.keys(this.services).length == 0) {
      // Temperature sensor is no longer equipped in SensorTags, use humidity sensor's temperature reading instead
      this.services = {
        light: new AmbientLight(this.cachedServices, this.cachedChars, this.id),
        humidity: new Humidity(this.cachedServices, this.cachedChars, this.id),
        pressure: new Pressure(this.cachedServices, this.cachedChars, this.id),
        movement: new Movement(this.cachedServices, this.cachedChars, this.id),
        outputs: new Outputs(this, this.id),
        inputs: new Inputs(this.cachedServices, this.cachedChars, this.id),
      };

      this.config = {};

      // this probably is an old version and has a separate temperature sensor in it
      if(this.peripheral.id[0] != "9") {
        this.services.temperature = new IRATemp(this.cachedServices, this.cachedChars, this.id);
        if(!config.temperature)
          config.temperature = {
            "enabled": true,
            "period": 1000
          }
      }

      this.updateConfig(config);
      this.updateBatteryLevel();
      this.batteryInterval = setInterval(this.updateBatteryLevel.bind(this), BATTERY_READ_INTERVAL);
    }
  }

  async updateConfig(overrideConfig) {
    this.config = Object.assign(this.config, overrideConfig);
    var keys = Object.keys(overrideConfig)

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      try {
        logger.debug("Updating config for " + key, this.toString());
        await this.services[key].updateConfig(overrideConfig[key]);
      } catch (e) {
        logger.warn("You cannot update config for " + key, this.toString());
      }
    }

    logger.info("Updated config and publishing new config to server", this.toString());
    client.pushConfig(this.id, this.config);
  }

  updateStatus(overrideStatus) {
    this.status = Object.assign(this.status, overrideStatus);
    logger.info("Status updated", this.toString());
    logger.debug(JSON.stringify(this.status), this.toString());
    client.pushStatus(this.id, this.status);
  }

  async freeServices() {
    clearTimeout(this.timeout);
    clearInterval(this.batteryInterval);

    logger.info("Freeing services", this.toString());
    if (this.services)
      var svcs = Object.values(this.services)
    for (var i = 0; i < svcs.length; i++) {
      svcs[i].free();
      logger.debug(`${svcs[i].name} has been freed`, this.toString());
    }
  }

  toString() {
    return `SensorTag@${this.id}`;
  }
}

module.exports = SensorTag;

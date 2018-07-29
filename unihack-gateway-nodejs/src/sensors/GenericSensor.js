"use-strict";

const BLEService = require("./BLEService");
const logger = require("../logger");

const DEFAULT_PERIOD = 1000;

class GenericSensor extends BLEService {
  constructor(services, chars, options, datapointName, deviceID) {
    super();

    this.deviceID = deviceID;
    this.name = datapointName;
    this.data = {}
    this.options = options;
    this.client = require("../mqttClient");

    super.init(services[options.uuid.service], chars, () => {
      this.initSensor();
    }, [options.uuid.data, options.uuid.config, options.uuid.period]);
  }

  async initSensor() {
    await this.setEnabled(false);
    await this.setPeriod(DEFAULT_PERIOD);
    this.subscribeChar(this.options.uuid.data, (tempBuffer) => {
      if (tempBuffer) {
        this.data = this.options.dataParser(tempBuffer);
        this.data.timestamp = Date.now();
        this.client.pushTelemetry(this.deviceID, this.name, this.data);
      }
    });
    this.ready = true;
    logger.info("Ready!", this.toString());
  }

  toString() {
    return `Sensor@${this.deviceID}|${this.name}`;
  }

  async setPeriod(periodMs) {
    if (periodMs < this.options.limit) {
      logger.warn(`Period is too low, minimum is ${this.options.limit}`, this.toString());
      return null;
    }

    // update period
    this._period = periodMs;

    // get buffer to write
    var buffer = Buffer.allocUnsafe(1);
    buffer.writeUInt8(periodMs / 10, 0);

    // push the updated period to the device
    if (!this.options.uuid.period) {
      logger.warn(`Period UUID is not provided`, this.toString());
      return null;
    } else {
      return super.writeChar(this.options.uuid.period, buffer).then((buffer) => {
        logger.info(`Updated period to ${periodMs}`, this.toString());
      });
    }
  }

  getPeriod() {
    return this._period;
  }

  setEnabled(enabled) {
    if (this.options.uuid.config && this._enabled != enabled) {
      this._enabled = enabled;
      if (enabled) {
        return super.writeChar(this.options.uuid.config, Buffer.from(this.options.enabled.trueBytes));
      } else {
        return super.writeChar(this.options.uuid.config, Buffer.from(this.options.enabled.falseBytes));
      }
    }
  }

  async waitReady() {
    while (true) {
      if (this.ready) {
        return;
      }
      logger.debug(`Device not ready`, this.toString());
      await sleep(100);
    }
  }

  async updateConfig(config) {
    await this.waitReady();
    logger.debug(`Received new configuration`, this.toString());
    if (config.period != undefined) {
      await this.setPeriod(config.period);
    }
    if (config.enabled != undefined) {
      await this.setEnabled(config.enabled);
    }
    logger.info(`New configuration applied: ${JSON.stringify(config)}`, this.toString());
  }

  free() {
    logger.debug(`Freeing`, this.toString());
    return this.unsubscribeChar(this.options.uuid.data);
  }

  // update service data
  _updateData() {
    return super.readChar(this.options.uuid.data).then((tempBuffer) => {
      if (tempBuffer) {
        this.data = this.options.dataParser(tempBuffer);
        this.data.timestamp = Date.now();
        this.client.pushTelemetry(this.deviceID, this.name, this.data);
      }
    });
  }
}

module.exports = GenericSensor;

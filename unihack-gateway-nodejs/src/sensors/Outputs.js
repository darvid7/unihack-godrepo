"use-strict";

const BLEService = require("./BLEService");
const logger = require("../logger")

const DATAPOINT_NAME = "outputs"
const SERVICE_UUID = "f000aa6404514000b000000000000000";
const DATA_UUID = "f000aa6504514000b000000000000000";
const CONFIG_UUID = "f000aa6604514000b000000000000000";

const LED_RED = 0x01;
const LED_GREEN = 0x02;
const BUZZER = 0x04;

class Outputs extends BLEService {
  constructor(sensorTag, mac) {
    super();

    this.name = "outputs";
    this.sensorTag = sensorTag;

    super.init(sensorTag.cachedServices, sensorTag.cachedChars, () => {
      this.setup();
    }, [DATA_UUID, CONFIG_UUID])
  }

  async setup(defaultConfig) {
    await super.writeChar(DATA_UUID, Buffer.from([0x00]));
    await super.writeChar(CONFIG_UUID, Buffer.from([0x01]));
    this.ready = true;
  }

  async waitReady() {
    while (true) {
      if (this.ready) {
        return;
      }

      logger.debug("Not ready", this.toString());
      await sleep(100);
    }
  }

  toString() {
    return `Outputs@${this.sensorTag.peripheral.address}`;
  }

  async updateConfig(config) {
    await this.waitReady();

    var r = config.led.red * LED_RED;
    var g = config.led.green * LED_GREEN;
    var b = config.buzzer * BUZZER;
    var byte = r | g | b;

    await super.writeChar(DATA_UUID, Buffer.from([byte]));
    logger.info("New configuration applied, byte " + byte, this.toString());
  }

  free() {
    // nothing to do
  }
}

module.exports = Outputs;

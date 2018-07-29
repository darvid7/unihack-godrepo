"use-strict";

const BLEService = require("./BLEService");
const logger = require("../logger");

class GenericTrigger extends BLEService {
  constructor(services, chars, options, dataCallback, deviceID, name) {
    super();

    this.deviceID = deviceID
    this.name = name;
    this.data = {}
    this.options = options;

    super.init(services[options.uuid.service], chars, () => {
      // init sensor-specifics
      if(options.uuid.config)
        this.setEnabled(true);

      super.subscribeChar(options.uuid.data, (data, isNotification) => {
        logger.info("Triggered!", this.toString());
        dataCallback(data, isNotification);
      });

    }, [options.uuid.data, options.uuid.config]);
  }

  free() {
    super.unsubscribeChar(this.options.uuid.data, (e) => {
      if(e) {
        logger.error(e, toString());
      }
    });
  }

  toString() {
    return `Trigger@${this.deviceID}|${this.name}`;
  }

  setEnabled(enabled) {
    this._enabled = enabled;
    if (enabled) {
      super.writeChar(this.options.uuid.config, Buffer.from(this.options.enabled.trueBytes));
    } else {
      super.writeChar(this.options.uuid.config, Buffer.from(this.options.enabled.falseBytes));
    }
  }
}

module.exports = GenericTrigger;

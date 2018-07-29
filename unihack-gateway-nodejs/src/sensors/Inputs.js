"use-strict";

const GenericTrigger = require("./GenericTrigger");

const SERVICE_UUID = "ffe0";
const DATA_UUID = "ffe1";
const CONFIG_UUID = null;
const DATAPOINT_NAME = "inputs";

class Inputs extends GenericTrigger {
  constructor(services, chars, mac) {
    super(services, chars, {
        uuid: {
          service: SERVICE_UUID,
          data: DATA_UUID,
          config: CONFIG_UUID,
        },
      },
      (data, isNotification) => {
        var val = data.readUInt8();
        var status = {
          buttons: {
            normal: "idle",
            power: "idle",
          },
          reed: "idle",
        };
        if (val & 0x01) {
          status.buttons.normal = "triggered";
        }
        if (val & 0x02) {
          status.buttons.power = "triggered";
        }
        if (val & 0x04) {
          status.reed = "triggered";
        }

        status.timestamp = Date.now();
        this.client.pushTelemetry(mac, "inputs", status);
      }, mac, DATAPOINT_NAME);

    this.client = require("../mqttClient");
  }
}

module.exports = Inputs;

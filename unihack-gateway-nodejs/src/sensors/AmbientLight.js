"use-strict";

const GenericSensor = require("./GenericSensor");

const DATAPOINT_NAME = "light"
const SERVICE_UUID = "f000aa7004514000b000000000000000";
const DATA_UUID = "f000aa7104514000b000000000000000";
const CONFIG_UUID = "f000aa7204514000b000000000000000";
const PERIOD_UUID = "f000aa7304514000b000000000000000";
const PERIOD_LIMIT = 300;

class AmbientLight extends GenericSensor {
  constructor(services, chars, mac) {
    super(services, chars, {
      uuid: {
        service: SERVICE_UUID,
        data: DATA_UUID,
        config: CONFIG_UUID,
        period: PERIOD_UUID,
      },
      limit: PERIOD_LIMIT,
      enabled: {
        trueBytes: [0x01],
        falseBytes: [0x00],
      },

      dataParser: (tempBuffer) => {
        // Convert to Lux
        // http://processors.wiki.ti.com/index.php/CC2650_SensorTag_User%27s_Guide#Optical_Sensor

        var raw = tempBuffer.readUInt16LE(0);
        var m = raw & 0x0FFF;
        var e = (raw & 0xF000) >> 12;
        e = (e == 0) ? 1 : 2 << (e - 1);
        return {
          raw: raw,
          lux: m * (0.01 * e)
        }
      }
    }, DATAPOINT_NAME, mac)
  }
}

module.exports = AmbientLight;

"use-strict";

const GenericSensor = require("./GenericSensor");

const DATAPOINT_NAME = "temperature";
const SERVICE_UUID = "f000aa0004514000b000000000000000";
const DATA_UUID = "f000aa0104514000b000000000000000";
const CONFIG_UUID = "f000aa0204514000b000000000000000";
const PERIOD_UUID = "f000aa0304514000b000000000000000";
const PERIOD_LIMIT = 300;

const SCALE_LSB = 0.03125;

class IRATemp extends GenericSensor {
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
        // Convert to celcius
        // http://processors.wiki.ti.com/index.php/CC2650_SensorTag_User%27s_Guide#IR_Temperature_Sensor
        var rawOb = tempBuffer.readInt16LE(0);
        var rawAm = tempBuffer.readInt16LE(2);
        var ob = (rawOb >> 2) * SCALE_LSB;
        var am = (rawAm >> 2) * SCALE_LSB;

        return {
          object: {
            raw: rawOb,
            celcius: ob,
          },
          ambient: {
            raw: rawAm,
            celcius: am
          }
        }
      }
    }, DATAPOINT_NAME, mac)
  }
}

module.exports = IRATemp;

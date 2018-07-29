"use-strict";

const GenericSensor = require("./GenericSensor");

const DATAPOINT_NAME = "humidity"
const SERVICE_UUID = "f000aa2004514000b000000000000000";
const DATA_UUID = "f000aa2104514000b000000000000000";
const CONFIG_UUID = "f000aa2204514000b000000000000000";
const PERIOD_UUID = "f000aa2304514000b000000000000000";
const PERIOD_LIMIT = 100;

class Humidity extends GenericSensor {
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
        // Convert to celcius and relative humidity
        // http://processors.wiki.ti.com/index.php/CC2650_SensorTag_User%27s_Guide#Humidity_Sensor

        var rawTemp = tempBuffer.readInt16LE(0);
        var rawHum = tempBuffer.readUInt16LE(2) & ~0x0003;
        var celcTemp = (rawTemp / 65536) * 165 - 40;
        var rhHum = (rawHum / 65536) * 100;

        return {
          temperature: {
            raw: rawTemp,
            celcius: celcTemp,
          },
          humidity: {
            raw: rawHum,
            rh: rhHum
          }
        }
      }
    }, DATAPOINT_NAME, mac)
  }
}

module.exports = Humidity;

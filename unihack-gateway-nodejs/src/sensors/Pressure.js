"use-strict";

const GenericSensor = require("./GenericSensor");

const DATAPOINT_NAME = "pressure"
const SERVICE_UUID = "f000aa4004514000b000000000000000";
const DATA_UUID = "f000aa4104514000b000000000000000";
const CONFIG_UUID = "f000aa4204514000b000000000000000";
const PERIOD_UUID = "f000aa4404514000b000000000000000";
const PERIOD_LIMIT = 100;

class Pressure extends GenericSensor {
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
        // Convert to hPa
        // http://processors.wiki.ti.com/index.php/CC2650_SensorTag_User%27s_Guide#Optical_Sensor
        const bufTemp = Buffer.from([
          tempBuffer[0], tempBuffer[1], tempBuffer[2], 0x00
        ]);
        const bufPres = Buffer.from([
          tempBuffer[3], tempBuffer[4], tempBuffer[5], 0x00
        ]);

        var rawBuf = tempBuffer.readUInt32LE(0)
        var rawTemp = bufTemp.readInt32LE(0)
        var rawPressure = bufPres.readUInt32LE(0)
        var temp = rawTemp / 100;
        var pres = rawPressure;

        return {
          temperature: {
            raw: rawTemp,
            celcius: temp,
          },
          pressure: {
            raw: rawPressure,
            hPa: pres
          }
        }
      }
    }, DATAPOINT_NAME, mac)
  }
}

module.exports = Pressure;

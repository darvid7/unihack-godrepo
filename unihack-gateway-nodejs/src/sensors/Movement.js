"use-strict";

const GenericSensor = require("./GenericSensor");

const DATAPOINT_NAME = "movement"
const SERVICE_UUID = "f000aa8004514000b000000000000000";
const DATA_UUID = "f000aa8104514000b000000000000000";
const CONFIG_UUID = "f000aa8204514000b000000000000000";
const PERIOD_UUID = "f000aa8304514000b000000000000000";
const PERIOD_LIMIT = 100;

const ACCEL_RANGE = 8;

function gyroConvert(raw) {
  return raw / (65536 / 500);
}

function accelConvert(raw) {
  return v = (raw * 1.0) / (32768 / ACCEL_RANGE);
}

function magConvert(raw) {
  return raw;
}

class Movement extends GenericSensor {
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
        trueBytes: [0x7F, 0xFF],
        falseBytes: [0x00, 0x00],
      },

      dataParser: (tempBuffer) => {
        // Convert appropriately
        // http://processors.wiki.ti.com/index.php/CC2650_SensorTag_User%27s_Guide
        var data = {
          gyro: {
            x: {},
            y: {},
            z: {},
          },
          accel: {
            x: {},
            y: {},
            z: {},
          },
          mag: {
            x: {},
            y: {},
            z: {},
          },
        };

        data.gyro.x.raw = tempBuffer.readInt16LE(0);
        data.gyro.y.raw = tempBuffer.readInt16LE(2);
        data.gyro.z.raw = tempBuffer.readInt16LE(4);
        data.accel.x.raw = tempBuffer.readInt16LE(6);
        data.accel.y.raw = tempBuffer.readInt16LE(8);
        data.accel.z.raw = tempBuffer.readInt16LE(10);
        data.mag.x.raw = tempBuffer.readInt16LE(12);
        data.mag.y.raw = tempBuffer.readInt16LE(14);
        data.mag.z.raw = tempBuffer.readInt16LE(16);

        Object.values(data.gyro).forEach((val) => {
          val.degPerSecond = gyroConvert(val.raw);
        });
        Object.values(data.accel).forEach((val) => {
          val.G = accelConvert(val.raw);
        });
        Object.values(data.mag).forEach((val) => {
          val.microTesla = magConvert(val.raw);
        });

        return data;
      }
    }, DATAPOINT_NAME, mac)
  }
}

module.exports = Movement;

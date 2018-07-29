/*
 *  httpApi.js
 *  Serves Docs and HTTP Api for retrieving device data
 *  Author: Tyler Goodwin
 */
const express = require('express');
const path = require('path');

const Auth = require('./utils/auth');

function HttpApi(deviceStore, mqttClient, config) {
  const api = express();
  const mqtt = mqttClient;
  var devices = deviceStore;

  //Create authorization object for basic auth
  const auth = new Auth(deviceStore, config);

  const basic = (req, res, next) => {
    auth.basic(req, res, next);
  }

  api.use(express.json());
  if (process.env.NODE_ENV === 'production') {
    var helmet = require('helmet');
    api.use(helmet());
  }
  // Serve up docs
  api.use("/", express.static(path.resolve(__dirname, './static')));

  // Sensor Data retrieval endpoints
  // -------------------------------------------------
  // TODO: CHECK USERNAME MATCHES DEVICE ID
  api.get('/devices', basic, (req, res) => {
    var user = Auth.decodeBasic(req);
    let queryArr = null;
    if (user.name != config.mqtt.username) {
      queryArr = [user.name];
    }
    var page = parseInt(req.params.page) || 0;
    var limit = parseInt(req.params.limit) || 10;
    devices.all(queryArr, page, limit, (err, result) => {
      if (err) res.status(400).json(err);
      else res.json(result);
    });
  });

  api.get('/devices/:deviceId/telemetry', basic, (req, res) => {
    var limit = parseInt(req.query.limit) || 20;
    limit = (limit < config.api.limits.telemetry) ? limit : config.api.limits.telemetry;
    var query = {};
    if (req.query.sensor) query.sensor = req.query.sensor;

    devices.getSensorData(req.params.deviceId, limit, query, (err, result) => {
      if (err) res.status(400).json(err);
      else res.json({
        deviceId: req.params.deviceId,
        sensorData: result
      });
    });
  });

  api.get('/devices/:deviceId/telemetry/historic', basic, (req, res) => {
    var limit = parseInt(req.query.pageSize) || 20;
    limit = (limit < config.api.limits.telemetry) ? limit : config.api.limits.telemetry;

    var query = {
      timestamp: {
        start: 0,
        end: (new Date()).getTime(),
      }
    };
    if (req.query.sensor) query.sensor = req.query.sensor;

    var page = req.query.page ? parseInt(req.query.page) : 0;

    try {
      if (req.query.startTime) {
        query.timestamp.start = parseInt(req.query.startTime);
      }
      if (req.query.endTime) {
        query.timestamp.end = parseInt(req.query.endTime);
      }
    } catch (e) {
      res.status(400).json(e);
      return;
    }

    devices.getPaginatedSensorData(req.params.deviceId, query, limit, page, (err, result) => {
      if (err) res.status(400).json(err);
      else res.json({
        deviceId: req.params.deviceId,
        searchConfig: {
          query: query,
          pageSize: limit,
          page: page
        },
        result: result
      });
    });
  });

  // Get device config/status
  // -------------------------------------------------
  api.get('/devices/:deviceId', basic, (req, res) => {
    devices.get(req.params.deviceId, (err, device) => {
      if (err) res.status(400).json(err);
      else if (!device) res.sendStatus(404);
      else res.json(device);
    })
  });

  // Device configuration endpoint
  // -------------------------------------------------
  api.put('/devices/:deviceId/config', basic, (req, res) => {
    if (req.body != undefined) {
      mqtt.publish(
        `commands/${req.params.deviceId}`,
        JSON.stringify({
          command: "updateConfig",
          body: req.body
        })
      );
      res.sendStatus(204);
    } else {
      res.status(400).json({
        error: "No body provided"
      });
    }
  });

  // Password update endpoint
  // -------------------------------------------------
  api.post('/devices/:deviceId/password', basic, (req, res) => {
    if (req.body.password) {
      devices.setApiKey(req.params.deviceId, req.body.password, (err, result) => {
        if (err) res.status(500).json({
          error: "Could not save new password"
        });
        else res.sendStatus(204);
      })
    } else {
      res.status(400).json({
        error: "Missing new password"
      });
    }
  });

  // Meme endpoint
  // -------------------------------------------------
  api.get('/answer', (req, res) => {
    res.json({
      answer: 42
    });
  })

  // Start web server
  api.listen(config.api.port, '0.0.0.0', () => {
    console.log(`[HTTP API]\tAPI listening on http://localhost:${config.api.port}`);
  });

  console.log(`[HTTP API]\tDocs available at http://localhost:${config.api.port}/`);
  return api;
}

module.exports = HttpApi;

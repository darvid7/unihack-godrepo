/*
 *  mqttServer.js
 *  MQTT Broker for facilitating device communication
 *  Author: Tyler Goodwin
 */
const mosca = require('mosca');
const ascoltatori = require('ascoltatori');
const Auth = require('./utils/auth');
const http = require('http');
const httpServ = http.createServer();

function MqttServer(db, config) {
    const auth = new Auth(db, config);

    const authenticate = function(client, username, password, callback) {
      if(!username || !password) return callback(null, false);

      if(username === config.mqtt.username){
        //Super User
        let authorized = (username === config.mqtt.username &&
          password.toString() === config.mqtt.password);
        if (authorized) client.user = username;
        callback(null, authorized);
      }
      else {
        // Single device user
        auth.authenticate(username, password.toString(), authorized => {
          if(authorized) client.user = username;
          callback(null, authorized);
        });
      }
    }

    const authorizePublish = function(client, topic, payload, callback) {
      deviceId = topic.split('/')[1];
      callback(null, client.user === config.mqtt.username || client.user === deviceId);
    }

    const authorizeSubscribe = function(client, topic, callback){
      deviceId = topic.split('/')[1];
      callback(null, client.user === config.mqtt.username || client.user === deviceId);
    }

    const settings = {
      port: config.mqtt.port
    }

    var server = new mosca.Server(settings);

    server.on('clientConnected', client => {
      console.log("[MQTT Server]\tClient connected: ", client.id);
    })

    server.on('ready', () => {
      // Override auth
      server.authenticate = authenticate;
      server.authorizePublish = authorizePublish;
      server.authorizeSubscribe = authorizeSubscribe;
      console.log(`[MQTT Server]\tStarting MQTT server on mqtt://localhost:${config.mqtt.port}`);
    });

    server.attachHttpServer(httpServ);
    httpServ.listen(config.mqtt.websocket);
    console.log(`[MQTT Server]\tMQTT server listening on ws://localhost:${config.mqtt.websocket}`);
}

module.exports = MqttServer;

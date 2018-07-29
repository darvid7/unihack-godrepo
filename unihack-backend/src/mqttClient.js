/*
*  mqttClient.js
*  MQTT Client for retrieving and storing data from devices
*  Author: Tyler Goodwin
*/
const mqtt = require('mqtt');

function MqttClient(deviceStore, config){

  const options = {
    clientId: "mqtt-to-http-adapter",
    username: config.mqtt.username,
    password: config.mqtt.password
  };

  const topics = {
    telemetry: "telemetry/#",
    config: "configuration/#",
    status: "status/#"
  };

  var devices = deviceStore;

  const client = mqtt.connect(`mqtt://${config.mqtt.host}:${config.mqtt.port}`, options);

  client.on('connect', () => {
    let topicStrs = Object.values(topics);
    console.log(`[MQTT Client]\tSubscribing to: ${topicStrs}`);
    client.subscribe(topicStrs);
  });

  client.on('message', (topic, message) => {
    let { baseTopic, deviceId, extras} = splitTopic(topic);

    //Parse oclet stream to object
    let data;
    try {
      data = JSON.parse(Buffer.from(message).toString('utf8'));
    }
    catch(e){
      console.error(`[MQTT Client]\tError while parsing JSON: ${e}`);
      return;
    }

    if(baseTopic === 'telemetry' && isValidTelemetry(data)){
      //Add sensor group to payload
      data.sensor = extras[0];
      //store validated data
      devices.pushSensorData(deviceId, data);
      return;
    }

    if(baseTopic === 'configuration' && isValidConfig(data)){
      devices.updateConfig(deviceId, data);
      return;
    }

    if(baseTopic === 'status' && isValidStatus(data)){
      devices.updateStatus(deviceId, data);
      return;
    }

    console.error(`[MQTT Client]\tError: Receieved bad message on ${topic} with payload: ${JSON.stringify(data)}`);
  });

  return client;
}

// Verify the submitted data is valid
function isValidTelemetry(data){
  if(data.timestamp === undefined){
    return false;
  }

  return true
}

function isValidConfig(data){
  if(data === undefined) return false;

  return true
}

function isValidStatus(data){
  if(data === undefined) return false;

  return true
}

//Split topic to retrieve base and deviceid
function splitTopic(topic){
  var splitTopic = topic.split('/');
  var baseTopic = splitTopic[0];
  var deviceId = '';
  var extras = [];

  if(splitTopic.length > 1){
    deviceId = splitTopic[1];
  }
  if(splitTopic.length > 2){
    extras = splitTopic.slice(2);
  }
  return { baseTopic, deviceId, extras}
}

module.exports = MqttClient;

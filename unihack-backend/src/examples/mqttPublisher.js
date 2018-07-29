/*
*  mqttPublisher.js
*  Example/Test application for publishing data to backend
*  Author: Tyler Goodwin
*/
const path = require('path');
const config = require(path.resolve(__dirname, '../../config.json'));

const mqtt = require('mqtt');

const args = require('yargs')
  .coerce({interval: parseInt})
  .argv;

console.log("MQTT Publisher");
console.log("------------------------\n");

if(args.h || args.help){
  console.log("Help");
  console.log("-------------------------------------------------------------");
  console.log("\t--host \t\tHost to connect to. \t\t\tDefault: localhost");
  console.log("\t--id \t\tDevice Id. \t\t\t\tDefault: mqttClient Id(random)");
  console.log("\t--interval \tMessage publishing interval in ms. \tDefault: 2000");
  console.log("\t--topic \tTopic to publish too. \t\t\tDefault: telemetry");
  console.log("\t--username \tUsername to use for mqtt connection");
  console.log("\t--password \tPassword to use for mqtt connection");
  console.log("-h\t-help \t\tView help");
  process.exit();
}

const options = {
  host: args.host || config.mqtt.host || 'localhost',
  deviceId: args.id || undefined,
  interval: args.interval || 2000,
  topic: args.topic,
  username: args.username,
  password: args.password
}

var settings = {};
if(options.username){
  settings.username = options.username;
  settings.password = options.password;
}

console.log(`Attempting to connect to ${options.host}.`);
const client  = mqtt.connect(`mqtt://${options.host}`, settings);
let i = 0;

options.deviceId = options.deviceId ? options.deviceId : client.options.clientId;
options.topic = options.topic ? options.topic : `telemetry/${options.deviceId}/test-sensor`;

if(args.q){
  console.log("Note: Running in quiet mode");
}

client.on('connect', function () {
  console.log("Connected!");
  console.log(`Publishing to topic: ${options.topic}`);
})

//Periodically publish incrementing number
setInterval(() => {
  i += 1;
  let data = {
    timestamp: Date.now(),
    value: i
  }

  let message = JSON.stringify(data);
  if(!args.q) console.log("Message: ", message);

  client.publish(options.topic, message);
}, options.interval);

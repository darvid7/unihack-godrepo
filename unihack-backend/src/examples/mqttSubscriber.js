/*
*  mqttSubscriber.js
*  Example/Test application for subscribing to data from devices via
*  MQTT Broker
*  Author: Tyler Goodwin
*/
const path = require('path');
const config = require(path.resolve(__dirname, '../../config.json'));

const mqtt = require('mqtt');

console.log("MQTT Subscriber");
console.log("------------------------\n");

const args = require('yargs').argv;

if(args.h || args.help){
  console.log("Help");
  console.log("-------------------------------------------------------------");
  console.log("\t--host \t\tHost to connect to. \tDefault: localhost");
  console.log("\t--topic \tTopic to subscribe too. \tDefault: telemetry");
  console.log("-h\t-help \t\tView help");
  process.exit();
}

const options = {
  host: args.host || config.mqtt.host || 'localhost',
  topic: args.topic || 'telemetry/#'
}

console.log(`Attempting to connect to ${options.host}.`);
var client  = mqtt.connect(`mqtt://${options.host}`);

client.on('connect', function () {
  console.log("Connected!");
  console.log(`Subscribing to ${options.topic}`);
  client.subscribe(options.topic);
})

client.on('message', (topic, message) => {
  let data = JSON.parse(Buffer.from(message).toString('utf8'));
  console.log(`Received from ${topic}: ${message}`);
})

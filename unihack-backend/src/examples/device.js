/*
*  device.js
*  Example Device implementation
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
  console.log("\t--interval \tTelemetry publishing interval in ms. \tDefault: 2000");
  console.log("\t--username \tUsername to use for mqtt connection");
  console.log("\t--password \tPassword to use for mqtt connection");
  console.log("-h\t-help \t\tView help");
  process.exit();
}

const options = {
  host: args.host || config.mqtt.host || 'localhost',
  deviceId: args.id || undefined,
  interval: args.interval || 2000,
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
options.topic = `telemetry/${options.deviceId}`;

var deviceConfig = {
  led1: 0,
  led2: 0,
}

var connectedAt = null;

if(args.q){
  console.log("Note: Running in quiet mode -- telemetry publishes will be suppressed");
}

client.on('connect', function () {
  console.log("Connected!");
  connectedAt = Date.now();
  client.subscribe(`commands/${options.deviceId}`);
  pushStatus();
  pushConfig();
})

client.on('message', (topic, payload) =>{
  let data = JSON.parse(Buffer.from(payload).toString('utf8'));
  if(data.command === 'pushConfig'){
    pushConfig();
  }
  if(data.command === 'pushStatus'){
    pushStatus();
  }
  if(data.command === 'updateConfig'){
    updateConfig(data.body);
  }
});

//Periodically publish incrementing number
setInterval(() => {
  let sensorData = {
    timestamp: Date.now(),
    light: Math.random() * 2 - Math.random() * 4 + 10
  }

  let message = JSON.stringify(sensorData);
  if(!args.q) console.log("Message: ", message);

  client.publish(options.topic + "/light_intensity", message);
}, options.interval * 2);

setInterval(() => {
  let sensorData = {
    timestamp: Date.now(),
    temperature: Math.random() * 2 - Math.random() * 4 + 20
  }

  let message = JSON.stringify(sensorData);
  if(!args.q) console.log("Message: ", message);

  client.publish(options.topic + "/temperature", message);
}, options.interval);

function pushStatus(){
  console.log("Push Status");
  client.publish(
    `status/${options.deviceId}`,
    JSON.stringify({connectedAt: connectedAt, updated: Date.now()})
  );
}

function pushConfig(){
  console.log("Push Config");
  client.publish(
    `configuration/${options.deviceId}`,
    JSON.stringify(Object.assign(deviceConfig, {updated: Date.now()}))
  );
}

function updateConfig(newConfig){
  console.log("Updating config with: ", newConfig);
  deviceConfig = Object.assign(deviceConfig, newConfig);
  pushConfig();
}

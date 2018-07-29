const TO_RADIANS = (Math.PI / 180);
var camera, scene, renderer;
var mesh, tagmesh, dt = 1 / 10;
var calibrate = true;
var meshTargetRotation = {
  x: 0,
  y: 0,
  z: 0,
};
const HEIGHT = window.innerHeight / 3;
const WIDTH = window.innerWidth / 2;

function calcRotation(angle, gyro, accel, dt) {
  return angle = 0.98 * (angle + gyro / 180 * 3.14 * dt); // + 0.02*accel;
}

function normalize(vector) {
  var d = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
  return {
    x: vector.x / d,
    y: vector.y / d,
    z: vector.z / d
  }
}

function init() {
  camera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT, 0.01, 10);
  camera.position.y = 2;
  camera.rotation.x = -Math.PI / 2;
  camera.rotation.z = Math.PI;
  console.log(camera)

  scene = new THREE.Scene();

  // simple mesh 
  var geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  var material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5
  });
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // tag mesh 
  tagmesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.2),
    new THREE.MeshPhongMaterial({
      color: 0xff0000,
      transparent: false
    })
  );
  scene.add(tagmesh);
  // lights---------------------
  var light = new THREE.AmbientLight(0x87CEEB);
  scene.add(light);

  var directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  scene.add(directionalLight);

  // render---------------------
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setSize(WIDTH, HEIGHT);
  document.getElementById("demo3d").appendChild(renderer.domElement);
}

function animate() {
  requestAnimationFrame(animate.bind(this));
  renderer.render(scene, camera);
}

//-------------------------

function connect(e) {
  e.preventDefault();
  const CLIENT_ID = `TEST_WEBAPP_${Date.now()}`;
  const DEVICE_ID = e.target[0].value;
  const HOST = e.target[1].value;
  const USERNAME = e.target[2].value;
  const PASSWORD = e.target[3].value ? e.target[3].value : `UNIHACK_Bosch${DEVICE_ID[DEVICE_ID.length - 2]}${DEVICE_ID[DEVICE_ID.length - 1]}`;
  e.target[e.target.length - 1].value = "Connecting..";
  e.target[e.target.length - 1].disabled = true;

  var client = mqtt.connect(`ws://${HOST}`, {
    clientId: CLIENT_ID,
    username: USERNAME,
    password: PASSWORD
  });

  client.on('connect', () => {
    document.getElementById("connect").classList.add("hidden")
    document.getElementById("panel").classList.remove("hidden")
    console.log("client connected!");

    client.subscribe(`telemetry/${DEVICE_ID}/#`);
    client.subscribe(`status/${DEVICE_ID}`);
    client.subscribe(`configuration/${DEVICE_ID}`);

    var targetPosition = {
      x: 0,
      y: 0,
      z: 0
    }

    var magStats = {
      max: { x: 0, y: 0, z: 0 },
      min: { x: 0, y: 0, z: 0 },
      startMag: new THREE.Vector3()
    };
    function lerp(val, min, max) {
      if (max - min == 0) {
        return 0;
      }
      return ((val - min) / (max - min)) * 2 - 1;
    }
    var down, east, north;
    var q_accel;

    function updateMagStats(mag) {
      if (mag.x.microTesla < magStats.min.x) magStats.min.x = mag.x.microTesla;
      if (mag.y.microTesla < magStats.min.y) magStats.min.y = mag.y.microTesla;
      if (mag.z.microTesla < magStats.min.z) magStats.min.z = mag.z.microTesla;
      if (mag.x.microTesla > magStats.max.x) magStats.max.x = mag.x.microTesla;
      if (mag.y.microTesla > magStats.max.y) magStats.max.y = mag.y.microTesla;
      if (mag.z.microTesla > magStats.max.z) magStats.max.z = mag.z.microTesla;
    }

    if(sampleFreq)
      sampleFreq = 10; //TODO: FIX

    client.on('message', (topic, payload) => {
      var data = JSON.parse(payload.toString());

      if (topic.indexOf("movement") >= 0) {
        if (calibrate) {
          calibrate = false;

          down = new THREE.Vector3(
            data.accel.x.G,
            data.accel.y.G,
            data.accel.z.G
          )
          down.normalize();

          // down line ---------------------
          var dgeometry = new THREE.Geometry();
          dgeometry.vertices.push(new THREE.Vector3(0, 0, 0));
          dgeometry.vertices.push(down.multiplyScalar(0.8))
          scene.add(new THREE.Line(dgeometry, new THREE.LineBasicMaterial({ color: 0xff0000 })));
        }

        updateMagStats(data.mag);

        var accelVector = new THREE.Vector3(
          data.accel.x.G,
          data.accel.y.G,
          data.accel.z.G,
        );
        accelVector.normalize();

        var gyroDelta = new THREE.Vector3(
          data.gyro.x.degPerSecond,
          data.gyro.y.degPerSecond,
          data.gyro.z.degPerSecond
        )
        gyroDelta.multiplyScalar(dt * TO_RADIANS);

        var magVector = new THREE.Vector3(
          lerp(data.mag.x.microTesla, magStats.min.x, magStats.max.x),
          lerp(data.mag.y.microTesla, magStats.min.y, magStats.max.y),
          lerp(data.mag.z.microTesla, magStats.min.z, magStats.max.z)
        );
        magVector.normalize();

        // mahonyAHRSupdate(
        madgwickAHRSupdate(
          data.gyro.x.degPerSecond * TO_RADIANS,
          data.gyro.y.degPerSecond * TO_RADIANS,
          data.gyro.z.degPerSecond * TO_RADIANS,
          data.accel.x.G,
          data.accel.y.G,
          data.accel.z.G,
          data.mag.x.raw,
          data.mag.y.raw,
          data.mag.z.raw,
          // magVector.x,
          // magVector.y,
          // magVector.z,
        );
        console.log(q0, q1, q2, q3);

        if(accelVector.angleTo(down) < 0.005 && Math.abs(accelVector.z - down.z) <= 0.1) {
          magStats.startMag = magVector;
          // console.log(accelVector.angleTo(down));
          // console.log(magStats.startMag);
        }

        targetPosition.x = accelVector.y;
        targetPosition.y = accelVector.z - 1;
        targetPosition.z = -accelVector.x;

        document.getElementById("a-x").innerHTML = data.accel.x.G;
        document.getElementById("a-y").innerHTML = data.accel.y.G;
        document.getElementById("a-z").innerHTML = data.accel.z.G;

        document.getElementById("g-x").innerHTML = data.gyro.x.degPerSecond;
        document.getElementById("g-y").innerHTML = data.gyro.y.degPerSecond;
        document.getElementById("g-z").innerHTML = data.gyro.z.degPerSecond;

        // // tagmesh.rotateX(gyroDelta.y);
        // // tagmesh.rotateY(gyroDelta.x);
        // // tagmesh.rotateZ(-gyroDelta.z);

        // var q = new THREE.Quaternion();
        // q = q.setFromUnitVectors(magStats.startMag, new THREE.Vector3(0,0,1));
        // var t = magVector.clone();
        // // console.log("---")
        // // console.log(t)
        // t = t.applyQuaternion(q);
        // t.normalize();
        // // console.log(t);
        // // console.log((new THREE.Vector3(0,1,0)).applyQuaternion(q))

        // var q_accel = new THREE.Quaternion(q1, q2, q3, q0);
        // console.log(q_accel);
        // q_accel.setFromUnitVectors(t, new THREE.Vector3(0,0,1));
        tagmesh.quaternion.set(q1,q2,q3,q0);

        document.getElementById("m-x").innerHTML = `${data.mag.x.microTesla} (${magVector.x})`;
        document.getElementById("m-y").innerHTML = `${data.mag.y.microTesla} (${magVector.y})`;
        document.getElementById("m-z").innerHTML = `${data.mag.z.microTesla} (${magVector.z})`;

      } else if (topic.indexOf("status") >= 0) {
        if (data.connection.terminated) {
          document.getElementById("status").innerHTML = "DISCONNECTED";
        } else {
          document.getElementById("status").innerHTML = "CONNECTED@" + data.timestamp;
        }
        document.getElementById("battery").innerHTML = data.batteryPercent + "%";

      } else if (topic.indexOf("light") >= 0) {
        document.getElementById("light").innerHTML = data.lux;

      } else if (topic.indexOf("humidity") >= 0) {
        document.getElementById("humidity").innerHTML = data.humidity.rh;
        document.getElementById("htemp").innerHTML = data.temperature.celcius;

      } else if (topic.indexOf("pressure") >= 0) {
        document.getElementById("pressure").innerHTML = data.pressure.hPa;
        document.getElementById("ptemp").innerHTML = data.temperature.celcius;

      } else if (topic.indexOf("inputs") >= 0) {
        document.getElementById("b-1").innerHTML = data.buttons.normal;
        document.getElementById("b-2").innerHTML = data.buttons.power;
        document.getElementById("reed").innerHTML = data.reed;

      } else if (topic.indexOf("config") >= 0) {
        delete data.timestamp;
        document.getElementById("config").value = JSON.stringify(data);

      } else {
        console.log(topic);
        console.log(data);
      }
    })

    // 3d visualization -----------------------------------

    const TARGET_FPS = 60;
    const SPEED = 7;
    var prevTime = performance.now();
    setInterval(() => {
      var currTime = performance.now();
      var dtms = (currTime - prevTime);
      var dt = dtms / 1000;
      var fps = 1 / dt;

      mesh.position.x += (targetPosition.x - mesh.position.x) * dt * SPEED;
      mesh.position.y += (targetPosition.y - mesh.position.y) * dt * SPEED + 0.1;
      mesh.position.z += (targetPosition.z - mesh.position.z) * dt * SPEED;

      prevTime = currTime;
    }, 1000 / TARGET_FPS);

    // Configuration updates -----------------------------------

    document.getElementById("updateStatus").onclick = function () {
      console.log("UpdateStatus")
      client.publish(`commands/${DEVICE_ID}`, JSON.stringify({
        command: "pushStatus"
      }));
    }

    function getConfig() {
      client.publish(`commands/${DEVICE_ID}`, JSON.stringify({
        command: "pushConfig"
      }));
    }
    document.getElementById("updateConfig").onclick = getConfig();

    function pushConfig(config) {
      var toPush = {
        command: "updateConfig",
        body: config
      }
      client.publish(`commands/${DEVICE_ID}`, JSON.stringify(toPush));
    }

    document.getElementById("pushConfig").onclick = function () {
      console.log("PushConfig")
      pushConfig(JSON.parse(document.getElementById("config").value));
    }

    document.getElementById("toggleGreen").onclick = function () {
      console.log("ToggleGreen")
      var body = JSON.parse(document.getElementById("config").value);
      body.outputs.led.green = !body.outputs.led.green;

      pushConfig(body);
    }

    document.getElementById("toggleRed").onclick = function () {
      console.log("ToggleRed")
      var body = JSON.parse(document.getElementById("config").value);
      body.outputs.led.red = !body.outputs.led.red;

      pushConfig(body);
    }

    document.getElementById("toggleBuzzer").onclick = function () {
      console.log("ToggleBuzzer")
      var body = JSON.parse(document.getElementById("config").value);
      body.outputs.buzzer = !body.outputs.buzzer;

      pushConfig(body);
    }

    getConfig();
  })
}

// main

init();
animate();

document.getElementById("connect").onsubmit = connect;

if (window.location.search) {
  var t = window.location.search.substring(1).split("&");
  var tosubmit = [];
  for (var i = 0; i < t.length; i++) {
    var keyval = t[i].split("=");

    if (keyval[0] == "submitForm") {
      var temp = document.getElementById(keyval[1]);
      if (temp)
        tosubmit.push(temp)
    } else if (document.getElementById(keyval[0])) {
      document.getElementById(keyval[0]).value = keyval[1];
    }
  }

  for (var i = 0; i < tosubmit.length; i++) {
    // tosubmit[i].submit();
    tosubmit[i].dispatchEvent(new Event("submit"));
  }
}


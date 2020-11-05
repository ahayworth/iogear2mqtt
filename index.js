const debug = require('debug')('iogear');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const mqtt = require('mqtt');

const argv = yargs(hideBin(process.argv))
  .options({
    'broker': {
      alias: 'b',
      describe: 'URL of your MQTT broker',
      demandOption: true,
      nargs: 1,
      requiresArg: true,
      type: 'string',
    },
    'ports': {
      alias: 'p',
      describe: 'Number of ports on the HDMI switch',
      default: 8,
      nargs: 1,
      requiresArg: true,
      type: 'number',
    },
    'serialport': {
      alias: 's',
      describe: 'The serial port connected to the HDMI switch',
      default: '/dev/ttyUSB0',
      nargs: 1,
      requiresArg: true,
      type: 'string',
    },
    'name': {
      alias: 'n',
      describe: 'The name of the HDMI switch',
      nargs: 1,
      requiresArg: true,
      type: 'string',
    },
    'unique_id': {
      alias: 'u',
      describe: 'A unique identifier for this switch',
      demandOption: true,
      nargs: 1,
      requiresArg: true,
      type: 'string',
    },
  })
  .argv;

const hdmi_name = argv.name || 'IOGEAR HDMI ' + argv.ports + '-port switch';
const hdmi_unique_id = argv.unique_id;
const hdmi_ports = argv.ports;

console.log('-------\nConfig\n-------');
console.log('Switch ports: ' + argv.ports);
console.log('TTY: ' + argv.serialport);
console.log('MQTT Broker: ' + argv.broker);
console.log('Device name: ' + argv.name);
console.log('Unique ID: ' + argv.unique_id);

console.log('\n-------------\nStarting up!\n-------------\n');

const availability_topic = 'homeassistant/switch/' + hdmi_unique_id + '/availability';

var hdmi_firmware = undefined;
var hdmi_active_port = undefined;

var registered = false;

var serial_conn = {};
var mqtt_conn = {};


function serial_write(command) {
  debug('Sending command: ' + command);
  serial_conn.port.write(command + '\r');
}

function mqtt_write(topic, msg) {
  debug(
    'Sending message to MQTT topic: ' +
    topic + '\n' + '  -> ' + msg
  );
  mqtt_conn.client.publish(topic, msg, { retain: true });
}

function mqtt_topic(part, i) {
  var p = i || '+';
  return [
    'homeassistant/switch',
    hdmi_unique_id,
    p,
    part,
  ].join('/');
}

function port_config(i) {
  var config = {
    name: 'Input ' + i,
    availability_topic: availability_topic,
    command_topic: mqtt_topic('set', i),
    state_topic: mqtt_topic('state', i),
    payload_off: 'off',
    payload_on: 'on',
    state_off: 'off',
    state_on: 'on',
    icon: 'mdi:set-top-box',
    unique_id: hdmi_unique_id + '_input_' + i,
    device: {
      identifiers: [hdmi_unique_id],
      manufacturer: 'IOGEAR',
      model: hdmi_ports + ' port HDMI switch',
      name: hdmi_name,
      sw_version: hdmi_firmware,
    },
  };

  return JSON.stringify(config);
}

function bail(err, prefix) {
  if (err !== null) {
    var message = err.message;
    if (prefix) message = prefix + message;

    console.log(message);
    process.exit(1);
  }
}

function reregister() {
  console.log('Registering with homeassistant');
  for (var i = 1; i <= hdmi_ports; i++) {
    mqtt_write(mqtt_topic('config', i), port_config(i));
  }
  mqtt_write(availability_topic, 'online');
  registered = true;
}

function updateports() {
  debug('updating ports with homeassistant');
  for (var i = 1; i <= hdmi_ports; i++) {
    var state = (hdmi_active_port === i ? 'on' : 'off');
    mqtt_write(mqtt_topic('state', i), state);
  }
  mqtt_write(availability_topic, 'online');
}

serial_conn.port = new SerialPort(argv.serialport, { baudRate: 19200 });

serial_conn.port.on('error', function(err) {
  return bail(err, 'Serial port: ');
});

serial_conn.parser = serial_conn.port.pipe(new Readline({ delimiter: '\r' }));
serial_conn.parser.on('error', function(err) {
  return bail(err, 'Serial port: ');
});

mqtt_conn.client = mqtt.connect(argv.broker, {
  will: {
    topic: availability_topic,
    payload: 'offline',
    retain: true,
  }
});

var mqtt_errs = ['error', 'close', 'offline'];
for (const e of mqtt_errs) {
  mqtt_conn.client.on(e, function(err) {
    return bail(err, 'MQTT: ');
  });
}

mqtt_conn.client.on('connect', function() {
  console.log('MQTT connected!');
  mqtt_conn.client.subscribe(mqtt_topic('set'));
  mqtt_conn.client.subscribe('homeassistant/status');
});

mqtt_conn.client.on('message', function(topic, message) {
  debug('Got message: ', topic + ' - ' + message);
  if (topic.indexOf('/set') != -1 && message == 'on') {
    var match = topic.match(/homeassistant\/switch\/[^/]+\/(?<input>\d)\/set/)
    var input = parseInt(match.groups.input);
    serial_write('sw i0' + input);
    serial_write('read');
  } else if (topic == 'homeassistant/status') {
    if (message == 'offline') {
      console.log('homeassistant is offline, but MQTT broker is alive');
    } else if (message == 'online') {
      console.log('homeassistant is back online');
      reregister();
      updateports();
    }
  }
});

serial_conn.parser.on('data', function(line) {
  var shouldUpdate = false;
  if (line.indexOf('Input: port') != -1) {
    var match = line.match(/Input: port\s+(?<port>\d+)/);
    var input = parseInt(match.groups.port);

    shouldUpdate = (hdmi_active_port !== input);
    hdmi_active_port = input;
  } else if (line.indexOf('F/W: V') != -1) {
    var match = line.match(/F\/W: (?<version>.+)$/);
    var fw = match.groups.version;
    hdmi_firmware = fw;
  }

  if (shouldUpdate) {
    if (registered === false) reregister();

    console.log('Got new active port: ' + hdmi_active_port);
    updateports();
  }
});

setInterval(function() {
  serial_write('read');
}, 3000);

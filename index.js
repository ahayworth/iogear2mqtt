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
const availability_topic = 'homeassistant/switch/' + hdmi_unique_id + '/availability';

var hdmi_firmware = undefined;
var hdmi_active_port = undefined;

var registered = false;

var serial_conn = {};
var mqtt_conn = {};

function hdmi_refresh() {
  serial_conn.port.write('read\r');
}

function command_topic(i) {
  var p = i || '+';
  return 'homeassistant/switch/' + hdmi_unique_id + '/' + p + '/set';
}

function state_topic(i) {
  var p = i || '+';
  return 'homeassistant/switch/' + hdmi_unique_id + '/' + p + '/state';
}

function config_topic(i) {
  var p = i || '+';
  return 'homeassistant/switch/' + hdmi_unique_id + '/' + p + '/config';
}

function port_config(i) {
  var config = {
    name: 'Input ' + i,
    availability_topic: availability_topic,
    command_topic: command_topic(i),
    state_topic: state_topic(i),
    payload_off: 'off',
    payload_on: 'on',
    state_off: 'off',
    state_on: 'on',
    unique_id: hdmi_unique_id + '_input_' + i,
    device: {
      identifiers: [hdmi_unique_id],
      manufacturer: 'IOGEAR',
      model: hdmi_ports + ' port HDMI switch',
      name: hdmi_name,
      sw_version: hdmi_firmware,
    }
  };

  return JSON.stringify(config);
}

function select_port(i) {
  serial_conn.port.write('sw i0' + i + '\r');
}

serial_conn.port = new SerialPort(argv.serialport, { baudRate: 19200 }, function(err) {
  if (err) {
    console.log(err.message);
  }
});

serial_conn.parser = serial_conn.port.pipe(new Readline({ delimiter: '\r' }));

serial_conn.port.on('error', function(err) {
  console.log(err.message);
});

mqtt_conn.client = mqtt.connect(argv.broker, {
  will: {
    topic: availability_topic,
    payload: 'offline',
    retain: true,
  }
});

mqtt_conn.client.on('connect', function() {
  console.log('mqtt connected!');
  mqtt_conn.client.subscribe(command_topic());
});

mqtt_conn.client.on('message', function(topic, message) {
  console.log('Got message: ', topic + ' - ' + message);
  if (topic.indexOf('/set') != -1 && message == 'on') {
    var match = topic.match(/homeassistant\/switch\/[^/]+\/(?<input>\d)\/set/)
    var input = parseInt(match.groups.input);
    select_port(input);
    hdmi_refresh();
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
    var match = line.match(/F\/W: (?<version>.+)$/)
    hdmi_firmware = match.groups.version;
  }

  if (registered === false && shouldUpdate) {
    for (var i = 1; i <= hdmi_ports; i++) {
      mqtt_conn.client.publish(config_topic(i), port_config(i))
    }
    registered = true;
  }

  if (registered === true && shouldUpdate) {
    for (var i = 1; i <= hdmi_ports; i++) {
      var state = (hdmi_active_port === i ? 'on' : 'off');
      mqtt_conn.client.publish(state_topic(i), state);
    }
    mqtt_conn.client.publish(availability_topic, 'online', {
      retain: true,
    });
  }
});

setInterval(function() {
  hdmi_refresh();
}, 3000);

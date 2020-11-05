## iogear2mqtt

iogear / aten HDMI switch <-> MQTT interface with homeassistant auto-discovery; via the RS-232 port on the switch.

The switch will show up as a device with independent switches for each input; turning on any switch will turn off the previously-selected input. Turning off any switch will do nothing (arguably you could disable the HDMI output in that case, but that function isn't exposed on the physical switches so it felt counter-intuitive).

MQTT topics (regardless of whether you use homeassistant or not):
- `homeassistant/switch/<unique_id>/availability` - `online` when connected to the switch; set to `offline` automatically as a last-will message when disconnected.
- `homeassistant/switch/<unique_id>/<input number>/config` - homeassistant auto config info
- `homeassistant/switch/<unique_id>/<input_number>/state` - 'off' or 'on'
- `homeassistant/switch/<unique_id>/<input_number>/set` - write 'on' to this topic to select this input


### Installation

Pre-reqs:
- node 14.x on your $PATH
  - https://github.com/nodesource/distributions#deb
- `npm install`

Other versions of node may work, but have not been tested.


### To run:

`node index.js --ports n --broker foo --unique_id bar`
- You must:
  - Specify the number of ports on your switch
  - Specify an MQTT broker. Use a URL string - for example, `mqtt://user:pass@ip`
- Ppass a unique_id string, for use in homeassistant. Pick something actually unique for your situation!
- You _may_:
  - Pass the `--serialport` argument, otherwise `/dev/ttyUSB0` is presumed.
  - Pass the `--name` argument; otherwise a suitable default is constructed. This name is shown in various places in homeassistant.
- For debugging, set the following environmental variable: `DEBUG='iogear'`. Additional low-level debugging is available for both mqtt.js and the SerialPort libraries; consult their documentation for more info.

### DietPi

I run this on a Raspberry Pi Zero; using USB hub with an ethernet adapter connected as well as a USB-to-Serial adapter. I've included a sample dietpi.txt config that you could adapt to your situation. Installation is out of scope for this document, but see the DietPi docs for more information: https://dietpi.com/docs/user-guide_installation

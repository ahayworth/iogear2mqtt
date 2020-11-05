## iogear2mqtt

iogear / aten HDMI switch <-> MQTT interface with homeassistant auto-discovery; via the RS-232 port on the switch.

The switch will show up as a device with independent switches for each input; turning on any switch will turn off the previously-selected input.
Turning _off_ any switch will do _nothing_ - much like how you can't actually disable an HDMI input on the physical switch with a button press. (Some models of Aten/IOGEAR switches do allow you to turn _off_ the entire input, but that is also decoupled from which input is selected).

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
  - Specify an MQTT broker. Use a URL string - for example, `mqtt://user:pass@ip`
  - Pass a unique_id string, for use in homeassistant. Pick something actually unique for your situation!
- You _may_:
  - Pass the `--serialport` argument, otherwise `/dev/ttyUSB0` is presumed.
  - Pass the `--name` argument; otherwise a suitable default is constructed. This name is shown in various places in homeassistant.
  - Pass the `--ports` argument to specify the number of ports on your switch; otherwise 8 is assumed.
- For debugging, set the following environmental variable: `DEBUG='iogear'`. Additional low-level debugging is available for both mqtt.js and the SerialPort libraries; consult their documentation for more info.

### DietPi

I run this on a Raspberry Pi Zero; using USB hub with an ethernet adapter connected as well as a USB-to-Serial adapter. I've included a sample dietpi.txt config that you could adapt to your situation. Installation is out of scope for this document, but see the DietPi docs for more information: https://dietpi.com/docs/user-guide_installation

### Notes

- My HDMI switch (an IOGEAR xxx) is actually a whitelabeled Aten VS0801HB.
  - Docs for the RS-232 protocol are here: https://assets.aten.com/product/manual/vs0801hb_um_w_2019-11-15.pdf
  - Broadly speaking, this tool should work for non-whitelabeled Aten HDMI switches as well.
- We could implement additional features if so desired. I didn't need them, so didn't do that yet.
- We tend to send more MQTT updates than is strictly necessary because the RS-232 protocol only provides a way to get the status of a current port - we could probably be a little smarter here, but it was just a lot easier to send a few extra MQTT messages.
- This is fairly homeassistant-specific, because that's what I run at home. However, I would be delighted to accept PRs that make it more generic/usable for non-homeassistant users. I just don't really know the "right way" to do things for non-homeassistant users myself! :)

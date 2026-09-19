'use strict';

const Homey = require('homey');
const { getVars, parseThermostats } = require('../../lib/uponor');

module.exports = class ThermostatDriver extends Homey.Driver {
  async onInit() {
    this.log('Uponor thermostat driver initialized');
  }

  async onPair(session) {
    let host = '';

    session.setHandler('set_host', async (value) => {
      host = String(value || '').trim();
      if (!host) throw new Error('Enter the gateway IP address');
      await getVars(host); // fail fast, before moving to the device list
      return true;
    });

    session.setHandler('list_devices', async () => {
      const vars = await getVars(host);
      const rooms = parseThermostats(vars);
      if (rooms.length === 0) {
        throw new Error('No thermostats found on that gateway');
      }
      return rooms.map((room) => ({
        name: room.name || `Room C${room.controller}T${room.thermostat}`,
        data: { id: room.prefix },
        store: { host, controller: room.controller, thermostat: room.thermostat },
        capabilities:
          room.humidity !== null
            ? ['measure_temperature', 'measure_humidity']
            : ['measure_temperature'],
      }));
    });
  }
};

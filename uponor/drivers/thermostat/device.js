'use strict';

const Homey = require('homey');
const { getVars, rawToCelsius, toInt } = require('../../lib/uponor');

const DEFAULT_POLL_INTERVAL_S = 60;

module.exports = class ThermostatDevice extends Homey.Device {
  async onInit() {
    const { controller, thermostat } = this.getStore();
    this._prefix = `C${controller}_T${thermostat}`;

    this._onSettingsChanged = (key) => {
      if (key === 'poll_interval') this._startPolling();
    };
    this.homey.settings.on('set', this._onSettingsChanged);

    await this._poll();
    this._startPolling();
  }

  async onUninit() {
    if (this._interval) this.homey.clearInterval(this._interval);
    this.homey.settings.off('set', this._onSettingsChanged);
  }

  _startPolling() {
    if (this._interval) this.homey.clearInterval(this._interval);
    const seconds = this.homey.settings.get('poll_interval') || DEFAULT_POLL_INTERVAL_S;
    this._interval = this.homey.setInterval(() => this._poll(), seconds * 1000);
  }

  async _poll() {
    const { host } = this.getStore();
    try {
      const vars = await getVars(host);
      const temp = rawToCelsius(vars[`${this._prefix}_room_temperature`]);
      if (temp !== null) {
        await this.setCapabilityValue('measure_temperature', temp).catch(this.error);
      }

      if (this.hasCapability('measure_humidity')) {
        const rh = toInt(vars[`${this._prefix}_rh`]);
        if (rh !== null) {
          await this.setCapabilityValue('measure_humidity', rh).catch(this.error);
        }
      }

      await this.setAvailable();
    } catch (err) {
      this.error('Poll failed:', err.message);
      await this.setUnavailable(err.message).catch(() => {});
    }
  }
};

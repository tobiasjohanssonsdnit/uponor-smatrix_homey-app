'use strict';

// JNAP client for a local Uponor Smatrix Pulse (X-265/X-245) R-208 gateway.
// Same protocol as the uponorx265 Home Assistant
// integration (https://github.com/dave-code-ruiz/uponorx265): a plain HTTP
// POST to http://<host>/JNAP/ with an x-jnap-action header, no auth needed
// on the local LAN.

const http = require('http');

const REQUEST_TIMEOUT_MS = 10000;
const THERMOSTAT_RE = /^C(\d+)_T(\d+)_room_temperature$/;

function postJnap(host, action, payload = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = http.request(
      {
        host,
        port: 80,
        path: '/JNAP/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'x-jnap-action': `http://phyn.com/jnap/${action}`,
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`JNAP ${action} failed: HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`JNAP ${action}: invalid JSON response`));
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error(`JNAP ${action} timed out`)));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getVars(host) {
  const res = await postJnap(host, 'uponorsky/GetAttributes');
  const vars = res && res.output && res.output.vars;
  if (!Array.isArray(vars)) {
    throw new Error('Unexpected JNAP response: output.vars missing');
  }
  const out = {};
  for (const item of vars) {
    if (item && typeof item.waspVarName === 'string' && 'waspVarValue' in item) {
      out[item.waspVarName] = item.waspVarValue;
    }
  }
  return out;
}

// Device temps are tenths of degF, offset by 320 (i.e. (raw/10 - 32) * 5/9).
function rawToCelsius(raw) {
  if (raw === undefined || raw === null) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  return Math.round(((n - 320) / 18) * 10) / 10;
}

function toInt(raw) {
  if (raw === undefined || raw === null) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

// Group the flat variable dict into one row per thermostat (C<n>_T<n>_*).
function parseThermostats(vars) {
  const rooms = [];
  for (const key of Object.keys(vars)) {
    const m = THERMOSTAT_RE.exec(key);
    if (!m) continue;
    const [, controller, thermostat] = m;
    const prefix = `C${controller}_T${thermostat}`;
    const humidity = toInt(vars[`${prefix}_rh`]);
    rooms.push({
      controller,
      thermostat,
      prefix,
      name: vars[`cust_${prefix}_name`] || null,
      temp: rawToCelsius(vars[`${prefix}_room_temperature`]),
      humidity: humidity || null, // 0 means "no sensor", same as the HA integration treats it
      batteryError: vars[`${prefix}_stat_battery_error`] === '1',
    });
  }
  rooms.sort((a, b) => a.controller - b.controller || a.thermostat - b.thermostat);
  return rooms;
}

module.exports = { getVars, parseThermostats, rawToCelsius, toInt };

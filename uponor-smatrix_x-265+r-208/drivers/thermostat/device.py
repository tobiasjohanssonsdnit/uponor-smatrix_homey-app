from homey.device import Device

from ...lib.uponor import get_vars, raw_to_celsius, to_int

DEFAULT_POLL_INTERVAL_S = 60


class ThermostatDevice(Device):
    async def on_init(self):
        await super().on_init()
        store = self.get_store()
        self._prefix = f"C{store['controller']}_T{store['thermostat']}"
        self._interval = None

        self.homey.settings.on("set", self._on_setting_set)
        self._start_polling()  # the SDK's interval fires once immediately

    async def on_uninit(self):
        self.homey.clear_interval(self._interval)
        self.homey.settings.remove_listener("set", self._on_setting_set)

    def _on_setting_set(self, key):
        if key == "poll_interval":
            self._start_polling()

    def _start_polling(self):
        self.homey.clear_interval(self._interval)
        seconds = self.homey.settings.get("poll_interval") or DEFAULT_POLL_INTERVAL_S
        self._interval = self.homey.set_interval(self._poll, int(seconds) * 1000)

    async def _poll(self):
        try:
            v = await get_vars(self.get_store()["host"])
            temp = raw_to_celsius(v.get(f"{self._prefix}_room_temperature"))
            if temp is not None:
                await self.set_capability_value("measure_temperature", temp)

            if self.has_capability("measure_humidity"):
                rh = to_int(v.get(f"{self._prefix}_rh"))
                if rh is not None:
                    await self.set_capability_value("measure_humidity", rh)

            await self.set_available()
        except Exception as err:
            self.error("Poll failed:", err)
            await self.set_unavailable(str(err))


homey_export = ThermostatDevice

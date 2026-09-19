from homey.driver import Driver, ListDeviceProperties
from homey.pair_session import PairSession

from ...lib.uponor import get_vars, parse_thermostats


class ThermostatDriver(Driver):
    async def on_init(self):
        await super().on_init()
        self.log("Uponor thermostat driver initialized")

    async def on_pair(self, session: PairSession):
        host = ""

        async def set_host(value):
            nonlocal host
            host = str(value or "").strip()
            if not host:
                raise ValueError("Enter the gateway IP address")
            await get_vars(host)  # fail fast, before moving to the device list
            return True

        async def list_devices(_view_data) -> list[ListDeviceProperties]:
            rooms = parse_thermostats(await get_vars(host))
            if not rooms:
                raise ValueError("No thermostats found on that gateway")
            return [
                {
                    "name": room["name"] or f"Room C{room['controller']}T{room['thermostat']}",
                    "data": {"id": room["prefix"]},
                    "store": {
                        "host": host,
                        "controller": room["controller"],
                        "thermostat": room["thermostat"],
                    },
                    "capabilities": (
                        ["measure_temperature", "measure_humidity"]
                        if room["humidity"] is not None
                        else ["measure_temperature"]
                    ),
                }
                for room in rooms
            ]

        session.set_handler("set_host", set_host)
        session.set_handler("list_devices", list_devices)


homey_export = ThermostatDriver

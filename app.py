from homey.app import App


class UponorApp(App):
    async def on_init(self):
        await super().on_init()
        self.log("Uponor Smatrix app initialized")


homey_export = UponorApp

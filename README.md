# Rinnai/Brivis Touch MQTT Proxy

This project is an MQTT proxy that interfaces with the Brivis/Rinnai Touch WiFi Kit, allowing you to control their air conditioners via MQTT. This was developed to address the lack of support in the official app for older Reverse Cycle systems, even though the hardware module does support them.

The MQTT proxy translates MQTT commands into raw commands understood by the WiFi module and forwards them to the device. Additionally, it publishes Home Assistant discovery configuration to the MQTT topic, allowing for automatic integration with Home Assistant.

**Note**: This is a "rough and ready" implementation. While it supports other systems, the limited testing has mainly been focused on reverse cycle systems.

## Features

- **Control Brivis/Rinnai systems via MQTT**: Send commands to an MQTT topic that the proxy translates into commands the WiFi module understands.
- **Home Assistant Integration**: Static discovery configuration is published for Home Assistant, allowing for automatic integration with a Reverse Cycle system.
- **Supports multiple systems**: While the focus of this implementation is on Reverse Cycle systems, it can support other Brivis/Rinnai systems, though it has not been thoroughly tested.

## Requirements

- Node.js
- MQTT broker (e.g., Mosquitto)
- Brivis/Rinnai Touch WiFi Kit

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/davidwallace80/rinnai-touch-proxy.git
   cd rinnai-touch-proxy
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure the following environment variables:

   ```env
   MQTT_HOST=<your-mqtt-broker-host>
   MQTT_PORT=<your-mqtt-broker-port> # default is 1883
   RINNAI_HOST=<your-rinnai-host-ip> #optional - self (UDP) discovery will be used if not specified. note. will not work in docker.
   RINNAI_PORT=<your-rinnai-port> #optional - self (UDP) discovery will be used if not specified. note. will not work in docker.
   LOG_LEVEL=3
   ```

4. Run the proxy:
   ```bash
   npm start
   ```

## Usage

Once the proxy is running, it listens for commands published to the configured MQTT topic and translates them into raw commands for the Rinnai module.

### Command Topic

Commands should be published to the MQTT topic: **rinnaitouch/command**

Example command to turn on Reverse Cycle mode:

```json
["reverseCycle", "operatingState", "on"]
```

### Config Topic

Config can be retreieved from the MQTT topic: **rinnaitouch/config**

## Home Assistant Integration

The proxy automatically publishes Home Assistant discovery configuration for Reverse Cycle systems to the MQTT topic homeassistant. This will allow Home Assistant to automatically detect and control your air conditioning system.

Currently supported entities:

- Status Sensor: Reports the online status of the proxy.
- Reverse Cycle Switch: Controls the Reverse Cycle operating state.
- Zone Control: Controls the system's mode (cooling, heating, etc.) and set temperature.

## Docker

The supplied Dockerfile can be used to create a docker image. Ensure enviroment variables have been supplied when starting the docker container. Note. Discovery of the Rinnai Touch module will not work in docker if host networking is not in use. You will need to supply host and port through environment variables.

## License

This project is licensed under the MIT License.

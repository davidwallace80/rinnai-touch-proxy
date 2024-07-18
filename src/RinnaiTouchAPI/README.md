# RinnaiTouchAPI

The RinnaiTouchAPI enables communication and control of the Brivis/Rinnai Touch Wifi Kit (NBW2 Module) for controlling Brivis/Rinnai air conditioning systems. The package facilitates the discovery of the Rinnai NBW2 module, communication via TCP/UDP, and the execution of commands to manage various aspects of the connected system.

**Note**: This is a "rough and ready" implementation. While it supports other systems, the limited testing has mainly been focused on reverse cycle systems.

## Features

- Discover Rinnai NBW2 modules on the network via UDP.
- Establish a TCP connection with the module. Retrieve and manage the system configuration (status, heating, cooling settings, etc.).
- Send commands to the Rinnai Touch system for gas heating, evaporative cooling, and reverse cycle air conditioning.

## Usage

**Basic Example**

    import { RinnaiTouchApi } from './RinnaiTouchAPI/api';

    (async () => {

    const rinnaiTouch = new RinnaiTouchApi();

    // Discover and connect to the Rinnai NBW2 module
    await rinnaiTouch.connect();

    // Get system configuration
    const config = rinnaiTouch.config();
    console.log('System Config:', config);

    // Send a command to turn on reverseCycle unit.
    const success = await rinnaiTouch.gasHeating('reverseCycle', 'operatingState', 'on');
    if (success) {
    console.log('Gas heating turned on successfully.');
    }

    // Disconnect
    rinnaiTouch.disconnect();
    })();

## API Overview

**discover()**

Discovers the Rinnai NBW2 module on the local network using UDP. It automatically finds the module's IP address and port number.

**connect(host?: string, port?: number)**

Establishes a TCP connection with the Rinnai module. If no host or port is provided, it will attempt to discover the module.

**status()**

Retrieves the current raw system status from the Rinnai module.

**config()**

Fetches the system configuration, translating it into a human-readable format.

**send(command: string)**

Sends a raw command to the connected Rinnai module.

**command(service: string, command: string, value: string): Promise<boolean>**

Sends command to the connected Rinnai module and confirms success.

**gasHeating(command: string, value: string): Promise<boolean>**

Sends a command to control gas heating. Example commands include:

**evapCooling(command: string, value: string): Promise<boolean>**

Sends a command to control evaporative cooling.

**addonCooling(command: string, value: string): Promise<boolean>**

Sends a command to control the addon cooling system.

**reverseCycle(command: string, value: string): Promise<boolean>**

Sends a command to control reverse cycle heating and cooling.

**disconnect()**

Disconnects from the Rinnai NBW2 module.

## Logging

The application uses tslog for logging. You can control the logging level through the LOG_LEVEL environment variable. Set this variable to any of the following levels:

0: Sill (trace-level)
1: Trace
2: Debug
3: Info (default)
4: Warn
5: Error
6: Fatal

## Commands and Configuration

The API supports the following services if available"

- reverseCycle
- gasHeating
- addonCooling
- evapCooling

Each service has specific commands that can be sent through the command() method. These are translated into internal JSON commands that are processed by the Rinnai module. Refer to commandSet.ts for commands and values.

## References

https://hvac-api-docs.s3.us-east-2.amazonaws.com/NBW2API_Iss1.3.pdf

## License

This project is licensed under the MIT License.

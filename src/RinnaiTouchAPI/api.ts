import _ from 'lodash';
import {RinnaiTouchNet, delay} from './net';
import {serviceCommandSet, systemCommandSet} from './commandSet';

type ConfigObject = Record<string, unknown>;
type CommandSetType = Record<
  string,
  {
    path: string;
    values?: Record<string, unknown>;
    readWrite: boolean;
    description: string;
    serviceId?: string;
    supportedServices?: string[];
  }
>;

export class RinnaiTouchApi extends RinnaiTouchNet {
  config(): ConfigObject {
    this.log.info('getting config');

    // make status searchable
    const statusObject = _.merge(this._status.state[0], ...this._status.state.slice(1)); // collapse arrays.

    // translate system configuration
    const systemConfig: ConfigObject = {};
    for (const setting of Object.keys(systemCommandSet)) {
      const commandDef = (systemCommandSet as CommandSetType)[setting];
      systemConfig[setting] = commandDef.values ? commandDef.values[_.get(statusObject, commandDef.path)] : _.get(statusObject, commandDef.path);
    }

    const config: ConfigObject = {system: systemConfig};

    // translate service configuration
    const serviceList = _.pickBy(systemCommandSet, o => _.has(o, 'serviceId'));

    for (const service of Object.keys(serviceList)) {
      if (systemConfig[service] === true) {
        const serviceEntry = serviceList[service] as {serviceId: string};
        const commandSet = serviceCommandSet(serviceEntry.serviceId);
        const serviceConfig: ConfigObject = {};
        for (const setting of Object.keys(commandSet)) {
          const commandDef = (commandSet as CommandSetType)[setting];
          if (commandDef.supportedServices?.includes(service)) {
            serviceConfig[setting] = commandDef.values ? commandDef.values[_.get(statusObject, commandDef.path)] : _.get(statusObject, commandDef.path);
          }
        }
        config[service] = serviceConfig;
      }
    }

    this.log.debug(`rinanitouch configuration:\n${JSON.stringify(config, null, 4)}`);
    return config;
  }

  async command(service: string, command: string, value: string): Promise<boolean> {
    this.log.info(`processing command: ${service}.${command}=${value}`);
    const serviceList = _.pickBy(systemCommandSet, o => _.has(o, 'serviceId'));

    // validate service
    const serviceListTyped = serviceList as Record<string, {serviceId: string}>;
    const configTyped = this.config() as {system: ConfigObject};
    if (!(service === 'system' || (serviceListTyped[service] && configTyped.system[service]))) {
      throw new Error(`${service} service unavailble or not valid!`);
    }

    // set command set.
    const commandSet = service === 'system' ? systemCommandSet : serviceCommandSet(serviceListTyped[service].serviceId);

    // validate command
    const commandDef = (commandSet as CommandSetType)[command];
    if (!(commandDef && commandDef.readWrite === true && commandDef.supportedServices?.includes(service))) {
      throw new Error('command not valid');
    }

    // validate value
    if (commandDef.values && !_.invert(commandDef.values as Record<string, string>)[value]) {
      throw new Error('value not valid!');
    }

    // construct payload
    const path = commandDef.path.split('.');
    const payload: ConfigObject = {};
    (payload[path[0]] as ConfigObject) = {};
    ((payload[path[0]] as ConfigObject)[path[1]] as ConfigObject) = {};
    ((payload[path[0]] as ConfigObject)[path[1]] as ConfigObject)[path[2]] = commandDef.values ? _.invert(commandDef.values)[value] : value;

    // send command
    this.send(JSON.stringify(payload, null, 0));

    // confirm command
    const timeout = 5000; // 5 seconds
    const interval = 1000; // 1 second
    const startTime = Date.now();

    do {
      await delay(interval);
      const currentConfig = this.config() as ConfigObject;
      if ((currentConfig[service] as ConfigObject)?.[command] === value) {
        return true;
      }
    } while (Date.now() - startTime < timeout);

    this.log.error(`failed to confirm command ${service}.${command}=${value} within timeout`);
    return false;
  }

  async gasHeating(command: string, value: string): Promise<boolean> {
    return this.command('gasHeating', command, value);
  }

  async evapCooling(command: string, value: string): Promise<boolean> {
    return this.command('evapCooling', command, value);
  }

  async addonCooling(command: string, value: string): Promise<boolean> {
    return this.command('addonCooling', command, value);
  }

  async reverseCycle(command: string, value: string): Promise<boolean> {
    return this.command('reverseCycle', command, value);
  }
}

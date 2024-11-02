import _ from 'lodash';
import {RinnaiTouchNet} from './net';
import {serviceCommandSet, systemCommandSet} from './commandSet';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class RinnaiTouchApi extends RinnaiTouchNet {
  config() {
    this.log.info('getting config');

    // make status searchable
    const statusObject = _.merge(this._status.state[0], ...this._status.state.slice(1)); // collapse arrays.

    // translate system configuration
    const systemConfig = {};
    for (const setting of Object.keys(systemCommandSet)) {
      systemConfig[setting] = systemCommandSet[setting].values ? systemCommandSet[setting].values[_.get(statusObject, systemCommandSet[setting].path)] : _.get(statusObject, systemCommandSet[setting].path);
    }

    const config = {system: systemConfig};

    // translate service configuration
    const serviceList = _.pickBy(systemCommandSet, o => _.has(o, 'serviceId'));

    for (const service of Object.keys(serviceList)) {
      if (systemConfig[service] === true) {
        const commandSet = serviceCommandSet(serviceList[service]['serviceId']);
        const serviceConfig = {};
        for (const setting of Object.keys(commandSet)) {
          if (commandSet[setting].supportedServices.includes(service)) {
            serviceConfig[setting] = commandSet[setting].values ? commandSet[setting].values[_.get(statusObject, commandSet[setting].path)] : _.get(statusObject, commandSet[setting].path);
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
    if (!(service === 'system' || (serviceList[service] && this.config()['system'][service]))) {
      throw new Error(`${service} service unavailble or not valid!`);
    }

    // set command set.
    const commandSet = service === 'system' ? systemCommandSet : serviceCommandSet(serviceList[service]['serviceId']);

    // validate command
    if (!(commandSet[command] && commandSet[command].readWrite === true && commandSet[command].supportedServices.includes(service))) {
      throw new Error('command not valid');
    }

    // validate value
    if (!(_.invert(commandSet[command].values)[value] || !commandSet[command].values)) {
      throw new Error('value not valid!');
    }

    // construct payload
    const path = commandSet[command].path.split('.');
    const payload = {};
    payload[path[0]] = {};
    payload[path[0]][path[1]] = {};
    payload[path[0]][path[1]][path[2]] = commandSet[command].values ? _.invert(commandSet[command].values)[value] : value;

    // send command
    this.send(JSON.stringify(payload, null, 0));

    // confirm command
    const timeout = 5000; // 5 seconds
    const interval = 1000; // 1 second
    const startTime = Date.now();

    do {
      await delay(interval);
      if (this.config()[service][command] === value) {
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

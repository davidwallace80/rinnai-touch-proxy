// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config();
import {Logger} from 'tslog';
import {RinnaiTouchApi} from './RinnaiTouchAPI/api';
import mqtt, {MqttClient} from 'mqtt';

const LOG_LEVEL = parseInt(process.env.LOG_LEVEL || '3');
const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = parseInt(process.env.MQTT_PORT || '1883');
const RINNAI_HOST = process.env.RINNAI_HOST;
const RINNAI_PORT = parseInt(process.env.RINNAI_PORT);
const ROOT_TOPIC = 'rinnaitouch';
const ONLINE_TOPIC = `${ROOT_TOPIC}/online`;
const CONFIG_TOPIC = `${ROOT_TOPIC}/config`;
const STATUS_TOPIC = `${ROOT_TOPIC}/status`;
const CONFIG_CMD_TOPIC = `${ROOT_TOPIC}/command`;
const STATUS_CMD_TOPIC = `${ROOT_TOPIC}/rawcommand`;
const HA_DISCOVERY_TOPIC = 'homeassistant';

const log = new Logger({minLevel: LOG_LEVEL});

function publishHaEntity(mqttClient: MqttClient, type: string, config: Object) {
  const entityBase = {
    platform: 'mqtt',
    device: {
      identifiers: ['rinnai_touch_proxy'],
      name: 'Rinnai Touch Proxy',
    },
    availability_topic: ONLINE_TOPIC,
    payload_available: 'true',
    payload_not_available: 'false',
  };

  Object.assign(config, entityBase);

  log.info(`publishing home assistant discovery for ${type} entity id ${config.unique_id}`);
  mqttClient.publish(`${HA_DISCOVERY_TOPIC}/${type}/${config.unique_id}/config`, JSON.stringify(config, null, 4), {retain: true});
}

function publishHaDiscovery(mqttClient: MqttClient) {
  publishHaEntity(mqttClient, 'binary_sensor', {
    name: 'Proxy Status',
    unique_id: 'rinnai_touch_proxy_status',
    state_topic: ONLINE_TOPIC,
    device_class: 'problem',
    payload_on: 'false',
    payload_off: 'true',
  });

  publishHaEntity(mqttClient, 'binary_sensor', {
    name: 'Reverse Cycle Calling Cooling',
    unique_id: 'rinnai_touch_proxy_reverse_cycle_cooling_called',
    state_topic: `${CONFIG_TOPIC}/reverseCycle/coolingCalled`,
    payload_on: 'true',
    payload_off: 'false',
  });

  publishHaEntity(mqttClient, 'binary_sensor', {
    name: 'Reverse Cycle Calling Heat',
    unique_id: 'rinnai_touch_proxy_reverse_cycle_heating_called',
    state_topic: `${CONFIG_TOPIC}/reverseCycle/heatingCalled`,
    payload_on: 'true',
    payload_off: 'false',
  });

  publishHaEntity(mqttClient, 'binary_sensor', {
    name: 'Reverse Cycle Compressor',
    unique_id: 'rinnai_touch_proxy_reverse_cycle_compressor_state',
    state_topic: `${CONFIG_TOPIC}/reverseCycle/compressorState`,
    payload_on: 'on',
    payload_off: 'off',
  });

  publishHaEntity(mqttClient, 'binary_sensor', {
    name: 'Reverse Cycle Fan',
    unique_id: 'rinnai_touch_proxy_reverse_cycle_fan_state',
    state_topic: `${CONFIG_TOPIC}/reverseCycle/fanState`,
    payload_on: 'on',
    payload_off: 'off',
  });

  publishHaEntity(mqttClient, 'binary_sensor', {
    name: 'System Status',
    unique_id: 'rinnai_touch_system_status',
    state_topic: `${CONFIG_TOPIC}/system/faultDetected`,
    device_class: 'problem',
    payload_on: 'true',
    payload_off: 'false',
    json_attributes_topic: CONFIG_TOPIC,
  });

  publishHaEntity(mqttClient, 'switch', {
    name: 'Reverse Cycle',
    unique_id: 'rinnai_touch_proxy_reverse_cycle_operating_state',
    device_class: 'switch',
    icon: 'mdi:power',
    state_topic: `${CONFIG_TOPIC}/reverseCycle/operatingState`,
    state_off: 'off',
    state_on: 'on',
    command_topic: CONFIG_CMD_TOPIC,
    payload_off: `["reverseCycle", "operatingState", "off"]`,
    payload_on: `["reverseCycle", "operatingState", "on"]`,
    optimistic: false,
  });

  publishHaEntity(mqttClient, 'climate', {
    name: 'Zone Control',
    unique_id: 'rinnai_touch_proxy_zone_common',
    modes: ['off', 'cool', 'heat_cool', 'heat'],
    mode_state_topic: `${CONFIG_TOPIC}/reverseCycle/reverseCycleMode`,
    mode_state_template: `{% set lookup = {"cooling": "cool", "cooling_heating": "heat_cool", "heating": "heat", "null": "off"} %} {{lookup[value]}}`,
    mode_command_topic: CONFIG_CMD_TOPIC,
    mode_command_template: `{% set lookup = {"cool": "cooling", "heat_cool": "cooling_heating", "heat": "heating"} %}["reverseCycle", "reverseCycleMode", "{{lookup[value]}}"]`,
    temperature_state_topic: `${CONFIG_TOPIC}/reverseCycle/setTemp`,
    temperature_state_template: `{% if value == "null" %}None{%else%}{{ value }}{% endif %}`,
    temperature_command_topic: CONFIG_CMD_TOPIC,
    temperature_command_template: `["reverseCycle", "setTemp", "{{value|int}}"]`,
    temperature_unit: 'C',
    temp_step: 1,
    precision: 1.0,
    min_temp: 8,
    max_temp: 30,
  });
}

async function publishRinnaiTouch(mqttClient: MqttClient, rinnaiTouch: RinnaiTouchApi) {
  const config = rinnaiTouch.config();
  log.info(`publishing to mqtt broker on ${mqttClient.options.host}:${mqttClient.options.port}`);
  const replacer = (k, v) => (v !== undefined ? v : null);
  mqttClient.publish(STATUS_TOPIC, JSON.stringify(rinnaiTouch._status.state, replacer, 4), {retain: true});
  mqttClient.publish(CONFIG_TOPIC, JSON.stringify(config, replacer, 4), {retain: true});

  // publish config properties
  for (const service of Object.keys(config)) {
    for (const key of Object.keys(config[service])) {
      const topic = `${CONFIG_TOPIC}/${service}/${key}`;
      const message = config[service][key] !== undefined ? String(config[service][key]) : 'null';
      mqttClient.publish(topic, message, {retain: true});
    }
  }
}

async function main() {
  log.info('starting rinnai touch proxy...');
  log.debug('debug enabled!');

  if (!MQTT_HOST) {
    throw new Error('mqtt host not specified!');
  }

  // Rinnai Touch setup
  const rinnaiTouch = RINNAI_HOST && RINNAI_PORT ? new RinnaiTouchApi(RINNAI_HOST, RINNAI_PORT) : new RinnaiTouchApi();
  await rinnaiTouch.connect();

  // MQTT setup
  const mqttClient = mqtt.connect({
    host: MQTT_HOST,
    port: MQTT_PORT,
    keepalive: 15,
    will: {topic: ONLINE_TOPIC, payload: Buffer.from('false', 'utf8'), retain: true},
  });

  mqttClient.on('connect', async () => {
    log.info(`connected to mqtt broker on ${MQTT_HOST}:${MQTT_PORT}`);
    mqttClient.publish(ONLINE_TOPIC, 'true', {retain: true});
    await publishRinnaiTouch(mqttClient, rinnaiTouch);
    publishHaDiscovery(mqttClient);
  });

  mqttClient.on('error', error => log.error(`MQTT error: ${error}`));

  // commands
  mqttClient.on('message', async (topic, payload) => {
    log.info(`command received: ${payload.toString()} on topic: ${topic}`);
    if (topic === CONFIG_CMD_TOPIC) {
      try {
        const command = JSON.parse(payload.toString());

        if (command.length !== 3) {
          throw new Error('invalid command format');
        }
        await rinnaiTouch.connect();
        const result = await rinnaiTouch.command(command[0], command[1], command[2]);
        result ? log.info(`command succesful: ${payload.toString()}`) : log.warn(`command failed: ${payload.toString()}`);
        mqttClient.publish(`${CONFIG_CMD_TOPIC}/success`, String(result));
      } catch (e) {
        log.error(`error processing command: ${e.message}`);
        mqttClient.publish(`${CONFIG_CMD_TOPIC}/success`, 'false');
      }
    }

    if (topic === STATUS_CMD_TOPIC) {
      await rinnaiTouch.connect();
      rinnaiTouch.send(payload.toString());
    }
  });

  mqttClient.subscribe(CONFIG_CMD_TOPIC);
  mqttClient.subscribe(STATUS_CMD_TOPIC);

  rinnaiTouch.on('statusChanged', () => {
    log.info('detected status change on rinnai touch');
    publishRinnaiTouch(mqttClient, rinnaiTouch);
  });

  rinnaiTouch.on('connectionSuccess', () => {
    mqttClient.publish(ONLINE_TOPIC, 'true', {retain: true});
  });

  rinnaiTouch.on('connectionError', () => {
    mqttClient.publish(ONLINE_TOPIC, 'false', {retain: true});
  });

  // stop service from exiting
  setInterval(() => {}, 10 * 60 * 1000);

  // Clean up on exit
  process.on('SIGINT', async () => {
    log.info('stopping rinnai touch proxy...');
    rinnaiTouch.disconnect();
    mqttClient.end(false, undefined, () => {
      log.info('disconnected mqtt broker.');
    });
    process.exit();
  });
}

main().catch(err => log.error(`error in main: ${err.message}`));

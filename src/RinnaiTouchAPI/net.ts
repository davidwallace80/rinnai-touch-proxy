require('dotenv').config(); // eslint-disable-line
import _ from 'lodash';
import {Logger} from 'tslog';
import * as dgram from 'dgram';
import * as net from 'net';
import {EventEmitter} from 'stream';

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface Status {
  raw: string;
  sequence: number;
  state: object[];
  timestamp: Date;
}

export class RinnaiTouchNet extends EventEmitter {
  _udpClient: dgram.Socket;
  _tcpClient: net.Socket;
  _status: Status;
  log = new Logger({minLevel: parseInt(process.env.LOG_LEVEL || '3')});
  connected = false;
  reconnect: boolean;
  connectionAttempt = 1;
  keepAlive: boolean;
  keepAliveInternal = 60;
  keepAliveId: NodeJS.Timeout;
  host: string;
  port: number;

  constructor(host?: string, port?: number) {
    super();
    if (host && port) {
      this.host = host;
      this.port = port;
    }
  }

  async discover() {
    return new Promise<void>((resolve, reject) => {
      this._udpClient = dgram.createSocket('udp4');

      this._udpClient.on('error', err => {
        this.log.error(`udp socket error: ${err}`);
        this._udpClient.close();
        reject(err);
      });

      this._udpClient.on('message', (msg, rinfo) => {
        this.log.debug(`received message: ${msg} from ${rinfo.address}:${rinfo.port}`);
        if (msg.toString().startsWith('Rinnai_NBW2_Module')) {
          this.host = rinfo.address;
          this.port = msg[32] * 256 + msg[33];
          this.log.info(`found Rinnai_NBW2_Module on ${this.host}:${this.port}`);
          this._udpClient.close();
          resolve();
        }
      });

      this._udpClient.bind(50000, () => {
        const address = this._udpClient.address();
        this.log.info(`discovery started on ${address.address}:${address.port}`);
      });
    });
  }

  async connect(reconnect = true, keepAlive = true) {
    this.reconnect = reconnect;
    this.keepAlive = keepAlive;
    this.log.debug(`connection settings: reconnect=${this.reconnect}, keepAlive=${this.keepAlive}`);

    if (this.connected) {
      this.log.info(`already connected to ${this.host}:${this.port}`);
      return;
    }

    // use discovery if not provided explicty or no previous discovery.
    if (!(this.host && this.port)) {
      await this.discover();
    }

    if (this.connectionAttempt >= 3) {
      this.emit('connectionError');
    }

    this.log.info(`attempting connection to ${this.host}:${this.port} (${this.connectionAttempt})`);

    this._tcpClient = new net.Socket();
    this._tcpClient.setKeepAlive(true, 60000);
    this._tcpClient.setTimeout(5000);

    return new Promise<void>((resolve, reject) => {
      this._tcpClient.connect(this.port, this.host, () => {
        this.log.info(`established connection to ${this.host}:${this.port}`);
      });

      this._tcpClient.once('data', async data => {
        this.log.debug(`received: ${data}`);
        if (data.toString() === '*HELLO*') {
          this.connected = true;
          this.log.info(`successfully connected to ${this.host}:${this.port}`);
          this.connectionAttempt = 1;
          this.emit('connectionSuccess');

          if (this.keepAlive) {
            this.keepAliveId = setInterval(() => {
              this.send('keepAlive');
            }, this.keepAliveInternal * 1000);
          }

          this._tcpClient.on('data', data => {
            this.log.debug(`received data: ${data}`);
            if (data.toString() !== '*HELLO*') {
              try {
                const lastStatus = this._status;

                this._status = {
                  raw: data.toString(),
                  sequence: +data.toString().substring(1, 7),
                  state: JSON.parse(data.toString().substring(7)),
                  timestamp: new Date(),
                };

                if (lastStatus?.raw !== this._status.raw) {
                  this.emit('statusChanged');
                }
              } catch (e) {
                this.log.error(e.message);
              }
            }
            resolve();
          });
        } else {
          this._tcpClient.end();
          reject(new Error(`failed to connect to ${this.host}:${this.port}, no hello!`));
        }
      });

      this._tcpClient.on('end', () => {
        this.log.warn(`received end of transmission from ${this.host}:${this.port}.`);
      });

      this._tcpClient.on('timeout', () => {
        this.log.warn(`closing connection to ${this.host}:${this.port} due to inactivity time out.`);
        this._tcpClient.destroy();
      });

      this._tcpClient.on('error', Error => {
        this.log.error(Error.message);
      });

      this._tcpClient.on('close', async hadError => {
        if (this._tcpClient) {
          this.log.warn(`connection still open to ${this.host}:${this.port}, forcing disconnect.`);
          this._tcpClient.destroy(); // Ensure the socket is closed
        }

        if (keepAlive) {
          this.log.debug('clearing keep alive interval');
          clearInterval(this.keepAliveId);
        }

        if (hadError) {
          this.log.warn(`disconnected with error from ${this.host}:${this.port}.`);
        } else {
          this.log.info(`disconnected from ${this.host}:${this.port}.`);
        }

        this.connected = false;

        if (this.reconnect) {
          await delay(5000); // adding delay to prevent rinnai touch module to refuse connection.
          this.connectionAttempt++;
          await this.connect();
        }
      });
    });
  }

  status() {
    this.log.info('getting status');
    if (!this.connected) {
      throw new Error('not connected to Rinnai_NBW2_Module!');
    }

    return this._status.state;
  }

  send(command: string) {
    this.log.info(`sending command: ${command}`);
    if (!this.connected) {
      throw new Error('not connected to Rinnai_NBW2_Module!');
    }

    const sequenceNum = this._status.sequence !== 255 ? this._status.sequence + 1 : 0;
    const data = `N${sequenceNum.toString().padStart(6, '0')}${command}`;
    this.log.debug(`sending data: ${data}`);

    this._tcpClient.write(data, async () => {
      this.log.info(`sent command: ${command}`);
    });
  }

  disconnect() {
    this.reconnect = false;
    this.connectionAttempt = 1;
    this._tcpClient.end();
  }
}

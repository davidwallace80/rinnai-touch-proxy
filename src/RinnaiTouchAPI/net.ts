require('dotenv').config(); // eslint-disable-line
import {Logger} from 'tslog';
import * as dgram from 'dgram';
import * as net from 'net';

interface Status {
  sequence: number;
  state: Object[];
  timestamp: Date;
}

export class RinnaiTouchNet {
  _udpClient: dgram.Socket;
  _tcpClient: net.Socket;
  _status: Status;
  log = new Logger({minLevel: parseInt(process.env.LOG_LEVEL || '3')});
  connected = false;
  host: string;
  port: number;

  constructor(host?: string, port?: number) {
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

  async connect(host?: string, port?: number) {
    if (this.connected) {
      this.log.info(`already connected to ${this.host}:${this.port}`);
      return;
    }

    if (host && port) {
      this.host = host;
      this.port = port;
    }

    // use discovery if not provided explicty or no previous discovery.
    if (!(this.host && this.port)) {
      await this.discover();
    }

    this._tcpClient = new net.Socket();
    this._tcpClient.setTimeout(5000);

    return new Promise<void>((resolve, reject) => {
      this._tcpClient.once('data', async data => {
        this.log.debug(`received: ${data}`);
        if (data.toString() === '*HELLO*') {
          this.connected = true;
          this.log.info(`successfully connected to ${this.host}:${this.port}`);

          this._tcpClient.on('data', data => {
            this.log.debug(`received data: ${data}`);
            if (data.toString() !== '*HELLO*') {
              try {
                this._status = {
                  sequence: +data.toString().substring(1, 7),
                  state: JSON.parse(data.toString().substring(7)),
                  timestamp: new Date(),
                };
              } catch (e) {
                this.log.error(e.message);
              }
            }
            resolve();
          });
        } else {
          this._tcpClient.destroy();
          reject(new Error(`failed to connect to ${this.host}:${this.port}`));
        }
      });

      this._tcpClient.on('close', hadError => {
        this.connected = false;
        if (hadError) {
          this.log.error(`unexpectedly disconnected from ${this.host}:${this.port}.`);
        } else {
          this.log.info(`disconnected from ${this.host}:${this.port}.`);
        }
      });

      this._tcpClient.connect(this.port, this.host, () => {
        this.log.info(`established connection to ${this.host}:${this.port}`);
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
    this._tcpClient.destroy();
  }
}

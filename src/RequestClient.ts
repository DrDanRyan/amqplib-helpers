import { Channel } from 'amqplib/callback_api';
const { id } = require('meteor-random');

export abstract class RequestClient {
  protected pending: RequestIndex = {};

  constructor(protected channel: Channel, protected replyTo: string, protected timeoutDelay = 3000) {
    channel.consume(replyTo, msg => {
      if (!this.pending[msg.properties.correlationId]) return;
      const {cb, timeout} = this.pending[msg.properties.correlationId];
      clearTimeout(timeout);
      const {err, res} = JSON.parse(msg.content.toString()) as ResponseContent;
      cb(err, res);
    }, { noAck: true });
  }

  protected request(routingKey: string, content: any, cb: (err: Error, res?: any) => void) {
    const contentBuffer = new Buffer(JSON.stringify(content));
    const correlationId = id();

    // publish request
    this.channel.publish('request', routingKey, contentBuffer, {
      contentType: 'application/json',
      replyTo: this.replyTo,
      correlationId
    });

    // register callback and timeout with pending index
    const timeout = setTimeout(() => {
      cb(new Error('Timeout Limit Exceeded.'));
      delete this.pending[correlationId];
    }, this.timeoutDelay);
    this.pending[correlationId] = { cb, timeout };
  }
}

export interface RequestIndex {
  [correlationId: string]: { cb: (err: Error, res?: any) => void, timeout: NodeJS.Timer };
}

export interface ResponseContent {
  err: Error;
  res?: any;
}
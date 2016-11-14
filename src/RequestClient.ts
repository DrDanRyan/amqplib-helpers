import { Channel } from 'amqplib/callback_api';
import { NotificationDispatcher } from './NotificationDispatcher';
const Random = require('meteor-random');

export interface RequestIndex {
  [correlationId: string]: { cb: (err: Error, res?: any) => void, timeout: NodeJS.Timer };
}

export abstract class RequestClient {
  protected pending: RequestIndex = {};
  protected dispatcher: NotificationDispatcher;

  constructor(protected channel: Channel, protected replyTo: string, protected serviceName: string, protected timeoutDelay = 3000) {
    this.dispatcher = new NotificationDispatcher(channel);
    channel.consume(replyTo, msg => {
      if (!this.pending[msg.properties.correlationId]) return;
      const {cb, timeout} = this.pending[msg.properties.correlationId];
      clearTimeout(timeout);
      const {err, res} = JSON.parse(msg.content.toString()) as {err: Error, res: any};
      cb(err, res);
    }, { noAck: true });
  }

  protected request(routingKey: string, content: any, cb: (err: Error, res?: any) => void) {
    const contentBuffer = new Buffer(JSON.stringify(content));
    const correlationId = Random.id();

    // publish request
    this.channel.publish('request', routingKey, contentBuffer, {
      contentType: 'application/json',
      replyTo: this.replyTo,
      correlationId
    });

    // register callback and timeout with pending index
    const loggingCb = (err: Error, res?: any) => {
      if (err) this.dispatcher.publish('log.error', {
        service: this.serviceName,
        role: 'client',
        routingKey,
        content,
        err,
      } as ErrorContent, correlationId);
      cb(err, res);
    };
    const timeout = setTimeout(() => {
      loggingCb(new Error('Timeout Limit Exceeded.'));
      delete this.pending[correlationId];
    }, this.timeoutDelay);
    this.pending[correlationId] = { cb: loggingCb, timeout };
  }
}

export interface ErrorContent {
  service: string;
  role: 'client' | 'server';
  routingKey: string;
  content: any;
  err: Error;
}
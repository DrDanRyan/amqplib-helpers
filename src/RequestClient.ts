import { Channel } from 'amqplib/callback_api';
import { NotificationDispatcher } from './NotificationDispatcher';
const Random = require('meteor-random');
const serializerr: (err: Error) => Error = require('serializerr');

export interface RequestIndex {
  [correlationId: string]: { cb: (err: Error, res?: any) => void, timeout: NodeJS.Timer };
}

export interface ErrorContent {
  service: string;
  role: 'client' | 'server';
  routingKey: string;
  content: any;
  err: Error;
}

export class RequestClient {
  protected pending: RequestIndex = {};
  protected dispatcher: NotificationDispatcher;

  constructor(protected channel: Channel, protected replyTo: string, protected serviceName: string, protected timeoutDelay = 3000) {
    this.dispatcher = new NotificationDispatcher(channel);
    channel.consume(replyTo, msg => {
      if (!this.pending[msg.properties.correlationId]) return;
      const {cb, timeout} = this.pending[msg.properties.correlationId];
      clearTimeout(timeout);
      const {err, res} = JSON.parse(msg.content.toString()) as { err: Error, res: any };
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
    this.dispatcher.publish('log.info', {
      message: `Request made by ${this.serviceName} to ${routingKey}`
    }, correlationId);

    // register callback and timeout with pending index
    const timeout = setTimeout(() => {
      const err = new Error('Timeout Limit Exceeded.');
      this.handleError(routingKey, content, err, correlationId, cb);
      delete this.pending[correlationId];
    }, this.timeoutDelay);
    this.pending[correlationId] = { cb, timeout };
  }

  protected handleError(routingKey: string, content: any, err: Error, correlationId: string, cb: (err?: Error) => void) {
    err = serializerr(err);
    this.dispatcher.publish('log.error', {
      service: this.serviceName,
      role: 'client',
      routingKey,
      content,
      err
    } as ErrorContent, correlationId);
    cb(err);
  }
}

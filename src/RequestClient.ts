import { Channel } from 'amqplib/callback_api';
import { id } from 'meteor-random';

export abstract class RequestClient {
  protected pending: RequestIndex;
  protected replyTo: string;

  constructor(protected channel: Channel, protected routingKey: string, protected timeoutDelay = 3000) {
    channel.assertQueue('', {exclusive: true}, (queueErr, ok) => {
      if (queueErr) throw queueErr;
      this.replyTo = ok.queue;
      channel.consume(ok.queue, msg => {
        if (!this.pending[msg.properties.correlationId]) return;
        const {cb, timeout} = this.pending[msg.properties.correlationId];
        clearTimeout(timeout);
        const {err, result} = JSON.parse(msg.content.toString()) as ResponseContent;
        cb(err, result);
      }, {noAck: true});
    });
  }

  protected request(resource: string, action: string, body: any, cb: (err: Error, res?: any) => void) {
    const content = new Buffer(JSON.stringify({resource, action, body}));
    const correlationId = id();
    this.channel.publish('request', this.routingKey, content, {
      contentType: 'application/json',
      replyTo: this.replyTo,
      correlationId
    });
    const timeout = setTimeout(() => {
      cb(new Error('Timeout Limit Exceeded.'));
      delete this.pending[correlationId];
    }, this.timeoutDelay);
    this.pending[correlationId] = {cb, timeout};
  }
}

export interface RequestIndex {
  [correlationId: string]: {cb: (err: Error, res?: any) => void, timeout: NodeJS.Timer};
}

interface ResponseContent {
  err: Error;
  result?: any;
}
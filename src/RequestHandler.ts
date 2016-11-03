import { Channel } from 'amqplib/callback_api';
import { ResponseContent } from './RequestClient';
const serializerr = require('serializerr');

export abstract class RequestHandler {
  constructor(protected channel: Channel, protected queue: string) {
    channel.consume(queue, msg => {
      const routingKey: string = msg.fields.routingKey;
      const content: any = JSON.parse(msg.content.toString());
      const replyTo: string = msg.properties.replyTo;
      const correlationId: string = msg.properties.correlationId;

      this.process(routingKey, content, correlationId, (err, res) => {
        if (err) err = serializerr(err);
        const responseContent: ResponseContent = { err, res };
        const responseBuffer = new Buffer(JSON.stringify(responseContent));
        channel.sendToQueue(replyTo, responseBuffer, { correlationId, contentType: 'application/json' });
        channel.ack(msg);
      });
    });
  }

  protected abstract process(routingKey: string, content: any, correlationId: string, cb: (err: Error, res?: any) => void): void;
}

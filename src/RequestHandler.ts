import { Channel } from 'amqplib/callback_api';
const serializerr = require('serializerr');

export abstract class RequestHandler {
  constructor(protected channel: Channel, protected queue: string) {
    channel.consume(queue, msg => {
      const content: any = JSON.parse(msg.content.toString());
      const replyTo: string = msg.properties.replyTo;
      const correlationId: string = msg.properties.correlationId;

      this.process(content, (err, result) => {
        if (err) err = serializerr(err);
        const reply = new Buffer(JSON.stringify({err, result}));
        channel.sendToQueue(replyTo, reply, { correlationId, contentType: 'application/json' });
        channel.ack(msg);
      });
    });
  }

  protected abstract process(content: any, cb: (err: Error, res?: any) => void): void;
}

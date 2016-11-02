import { Channel } from 'amqplib/callback_api';
const serializerr = require('serializerr');

export abstract class RequestHandler {
  constructor(protected channel: Channel, protected queue: string) {
    channel.consume(queue, msg => {
      console.log('incoming msg:', msg);
      const routingKey: string = msg.fields.routingKey;
      const content: any = JSON.parse(msg.content.toString());
      const replyTo: string = msg.properties.replyTo;
      const correlationId: string = msg.properties.correlationId;

      this.process(routingKey, content, correlationId, (err, res) => {
        console.log('inside RequestHandler.process cb');
        if (err) err = serializerr(err);
        console.log(JSON.stringify({ err, res }));
        console.log(replyTo);
        console.log(correlationId);
        const reply = new Buffer(JSON.stringify({ err, res }));
        channel.sendToQueue(replyTo, reply, { correlationId, contentType: 'application/json' });
        channel.ack(msg);
      });
    });
  }

  protected abstract process(routingKey: string, content: any, correlationId: string, cb: (err: Error, res?: any) => void): void;
}

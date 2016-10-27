import { Channel } from 'amqplib/callback_api';

export abstract class TaskHandler {
  constructor(protected channel: Channel, protected queue: string) {
    channel.consume(queue, msg => {
      const routingKey: string = msg.fields.routingKey;
      const content: any = JSON.parse(msg.content.toString());
      this.process(routingKey, content, () => { channel.ack(msg); });
    });
  }

  protected abstract process(routingKey: string, content: any, cb: () => void): void;
}

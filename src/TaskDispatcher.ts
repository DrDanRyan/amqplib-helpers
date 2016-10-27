import { Channel } from 'amqplib/callback_api';

export class TaskDispatcher {
  constructor(protected channel: Channel, protected exchange: string) { }

  protected publish(routingKey: string, content: any, correlationId?: string) {
    this.channel.publish(this.exchange, routingKey, new Buffer(JSON.stringify(content)), {
      contentType: 'application/json',
      correlationId
    });
  }
}
import { Channel } from 'amqplib/callback_api';

export class NotificationDispatcher {
  constructor(protected channel: Channel) { }

  protected publish(routingKey: string, content: any, correlationId?: string) {
    this.channel.publish('notify', routingKey, new Buffer(JSON.stringify(content)), {
      contentType: 'application/json',
      correlationId
    });
  }
}
import { Channel, Connection, connect as openConnection } from 'amqplib/callback_api';

export function connect(cb: (err: Error, result?: {channel: Channel, connection: Connection}) => void) {
  openConnection(process.env.RABBITMQ_URL, (connectErr, connection) => {
    if (connectErr) return cb(connectErr);
    connection.createChannel((channelErr, channel) => {
      if (channelErr) {
        connection.close();
        return cb(channelErr);
      }
      cb(null, {channel, connection});
    });
  });
}
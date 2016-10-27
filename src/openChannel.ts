import { Channel, Connection, connect } from 'amqplib/callback_api';

export function openChannel(cb: (err: Error, result?: {channel: Channel, connection: Connection}) => void) {
  connect(process.env.RABBITMQ_URL, (connectErr, connection) => {
    if (connectErr) return cb(connectErr);
    connection.createChannel((channelErr, channel) => {
      if (channelErr) {
        connection.close();
        return cb(channelErr);
      }
      cb(null, {connection, channel});
    });
  });
}
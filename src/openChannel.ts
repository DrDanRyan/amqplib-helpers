import { Channel, connect } from 'amqplib/callback_api';

export function openChannel(cb: (err: Error, result?: Channel) => void) {
  connect(process.env.RABBITMQ_URL, (connectErr, connection) => {
    if (connectErr) return cb(connectErr);
    process.on('SIGINT', () => connection.close());
    connection.createChannel((channelErr, channel) => {
      if (channelErr) {
        connection.close();
        return cb(channelErr);
      }
      cb(null, channel);
    });
  });
}
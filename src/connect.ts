import { Channel, Connection, connect as openConnection } from 'amqplib/callback_api';

export function connect(url: string, cb: (err: Error, result?: {channel: Channel, connection: Connection}) => void) {
  openConnection(url, (connectErr, connection) => {
    if (connectErr) return cb(connectErr, null);
    connection.createChannel((channelErr, channel) => {
      if (channelErr) {
        connection.close();
        return cb(channelErr, null);
      }
      cb(null, {channel, connection});
    });
  });
}
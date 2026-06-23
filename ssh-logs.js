const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('ls -la /root /home /var/www /opt', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('' + data);
    }).stderr.on('data', (data) => {
      console.error('' + data);
    });
  });
}).connect({
  host: '165.245.185.180',
  port: 22,
  username: 'root',
  password: 'HaryKurniawan203'
});

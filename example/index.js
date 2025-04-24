const express = require('express');
const _ = require('lodash');

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  const message = _.capitalize('hello from flash-install example!');
  res.send(message);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

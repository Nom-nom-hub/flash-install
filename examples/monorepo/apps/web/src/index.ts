import express from 'express';
import { greet, sum } from 'package-a';
import { fetchUserAndGreet } from 'package-b';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Welcome to the monorepo example!');
});

app.get('/greet/:name', (req, res) => {
  const name = req.params.name;
  res.send(greet(name));
});

app.get('/sum', (req, res) => {
  const numbers = [1, 2, 3, 4, 5];
  res.send(`Sum: ${sum(numbers)}`);
});

app.get('/user/:id', async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const greeting = await fetchUserAndGreet(userId);
  res.send(greeting);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

import axios from 'axios';
import { greet } from 'package-a';

export async function fetchUserAndGreet(userId: number): Promise<string> {
  try {
    const response = await axios.get(`https://jsonplaceholder.typicode.com/users/${userId}`);
    const user = response.data;
    return greet(user.name);
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

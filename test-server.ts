import { Elysia } from 'elysia';

const app = new Elysia()
  .get('/', () => 'Hello Raite!')
  .listen(4000, () => {
    console.log('🚀 Test server running on port 4000');
  });

console.log('Test server created');

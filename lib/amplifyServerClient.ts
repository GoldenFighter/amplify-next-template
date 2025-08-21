import { type Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';
import { cookies } from 'next/headers';
import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';

export const serverClient = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies,
});

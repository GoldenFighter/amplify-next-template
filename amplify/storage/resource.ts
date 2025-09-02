import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'picfight-contest-storage',
  access: (allow) => ({
    'contest-submissions/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  })
});

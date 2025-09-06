import usersAgent from '@/agents/users-agent';
import bcrypt from 'bcryptjs';

export interface SignupValues {
  username: string;
  email: string;
  password: string;
}

export async function signupUser(values: SignupValues) {
  const passwordHash = bcrypt.hashSync(values.password, 10);
  await usersAgent.add({
    id: values.username,
    username: values.username,
    displayName: values.username,
    email: values.email,
    passwordHash,
    isAdmin: false,
  });
}

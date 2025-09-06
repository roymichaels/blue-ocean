import { signupUser } from '@/app/signupLogic';
const t = (s: string) => s;

jest.mock('@/agents/users-agent', () => ({
  add: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hashSync: jest.fn(() => 'hashed'),
}));

describe(t('signupUser'), () => {
  const values = { username: 'alice', email: 'alice@example.com', password: 'secret' };

  beforeEach(() => {
    const { add } = require('@/agents/users-agent');
    add.mockReset();
  });

  it(t('adds user via agent'), async () => {
    const { add } = require('@/agents/users-agent');
    await signupUser(values);
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alice', email: 'alice@example.com', passwordHash: 'hashed' }),
    );
  });

  it(t('throws when agent fails'), async () => {
    const { add } = require('@/agents/users-agent');
    add.mockRejectedValueOnce(new Error('fail'));
    await expect(signupUser(values)).rejects.toThrow('fail');
  });
});


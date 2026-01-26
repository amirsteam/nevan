import User from '../models/User';

describe('User Model Test', () => {
  it('should create & save user successfully', async () => {
    const userData = {
      name: 'Test Admin',
      email: 'admin@bivan.com',
      password: 'password123',
      role: 'admin' as const,
      phone: '9841234567',
    };
    const validUser = new User(userData);
    const savedUser = await validUser.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(userData.name);
    expect(savedUser.email).toBe(userData.email);
  });
});

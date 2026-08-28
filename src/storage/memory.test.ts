import { describe, it, expect } from 'vitest';
import { MemoryStorage } from './memory';

describe('MemoryStorage', () => {
  it('put/get/remove i signedUrl', async () => {
    const s = new MemoryStorage('http://localhost:3000', 'k1');
    await s.put('a/b.jpg', Buffer.from('xx'), 'image/jpeg');
    expect((await s.get('a/b.jpg'))?.toString()).toBe('xx');
    expect(await s.signedUrl('a/b.jpg', 60)).toBe('http://localhost:3000/api/file/a/b.jpg?k=k1');
    await s.remove(['a/b.jpg']);
    expect(await s.get('a/b.jpg')).toBeNull();
  });
});

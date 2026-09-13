import { logger } from '@/lib/logger';
import { describe, expect, it } from 'vitest';

describe('logger', () => {
  it('has debug, info, warn, error methods', () => {
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('has child method', () => {
    expect(typeof logger.child).toBe('function');
  });

  it('child returns new logger with context', () => {
    const child = logger.child({ module: 'test' });
    expect(typeof child.info).toBe('function');
    expect(typeof child.error).toBe('function');
  });

  it('logger methods do not throw', () => {
    expect(() => logger.info('test message')).not.toThrow();
    expect(() => logger.error('test error')).not.toThrow();
    expect(() => logger.warn('test warning')).not.toThrow();
    expect(() => logger.debug('test debug')).not.toThrow();
  });

  it('child logger does not throw', () => {
    const child = logger.child({ requestId: 'abc-123' });
    expect(() => child.info('child message')).not.toThrow();
    expect(() => child.error('child error')).not.toThrow();
  });
});

import { describe, expect, it } from 'vitest';
import { parseIdentifier } from '../domain';

describe('parseIdentifier', () => {
  it.each([
    ['WEB-12', { teamKey: 'WEB', number: 12 }],
    [' plt-3 ', { teamKey: 'PLT', number: 3 }],
    ['WEB12', null],
    ['W-1', null],
    ['WEB-', null],
  ])('parses %j', (value, expected) => {
    expect(parseIdentifier(value)).toEqual(expected);
  });
});

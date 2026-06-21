import { describe, expect, it } from 'vitest';
import { dutyTypeToShiftDefinition, shiftDefinitionToDutyType } from './shiftMapping';

describe('shiftMapping', () => {
  it('maps weekday nursing duty to shift definition params', () => {
    expect(dutyTypeToShiftDefinition('rb_nursing_weekday', 'Nord')).toEqual({
      category: 'RB_WEEKDAY',
      role: 'NURSING',
      area: 'Nord',
      time_of_day: 'NONE',
    });
  });

  it('roundtrips shift definition back to duty type', () => {
    const shiftDef = {
      id: 1,
      category: 'RB_WEEKEND' as const,
      role: 'NURSING' as const,
      area: 'Mitte' as const,
      time_of_day: 'NIGHT' as const,
      is_weekday: false,
      is_weekend: true,
    };

    expect(shiftDefinitionToDutyType(shiftDef)).toEqual({
      dutyType: 'rb_nursing_weekend_night',
      area: 'Mitte',
    });
  });
});

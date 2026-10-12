import {
  RSSI_GOOD_ABOVE_DBM,
  RSSI_UNUSABLE_BELOW_DBM,
  SNR_SCALE_MAX_DB,
  SNR_SCALE_MIN_DB,
} from '../src/config/signal';

describe('signal thresholds (PRD B5)', () => {
  it('leaves a Weak band between the Good and Unusable limits', () => {
    expect(RSSI_UNUSABLE_BELOW_DBM).toBeLessThan(RSSI_GOOD_ABOVE_DBM);
  });

  it('matches the limits stated in PRD B5', () => {
    expect(RSSI_GOOD_ABOVE_DBM).toBe(-95);
    expect(RSSI_UNUSABLE_BELOW_DBM).toBe(-100);
  });

  it('keeps the SNR scale bounds ordered', () => {
    expect(SNR_SCALE_MIN_DB).toBeLessThan(SNR_SCALE_MAX_DB);
  });
});

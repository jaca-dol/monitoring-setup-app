/**
 * Smoke test: the app renders. Stage 0 has nothing else to assert — the
 * interesting tests arrive with the codec layer, which is designed to be
 * testable without hardware.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import App from '../src/App';

test('renders without crashing', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

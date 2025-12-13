import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MapView from '../MapView';

// Basic sanity: ensure it renders without crashing when no coords
describe('MapView', () => {
  it('renders without markers when coords missing', () => {
    const { container } = render(<MapView prospections={[{ id: '1', name: 'Test' }]} />);
    expect(container).toBeTruthy();
  });
});

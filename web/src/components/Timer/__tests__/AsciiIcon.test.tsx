import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AsciiIcon } from '../AsciiIcon';

describe('AsciiIcon', () => {
  describe('Hourglass Icon', () => {
    it('should render hourglass icon', () => {
      render(<AsciiIcon type="hourglass" progress={50} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon).toBeDefined();
      expect(icon.textContent).toContain('╔');
      expect(icon.textContent).toContain('╚');
    });

    it('should render work mode with falling sand animation', () => {
      render(<AsciiIcon type="hourglass" progress={50} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      // Work mode should have falling indicators (▼ or ·)
      expect(icon.textContent).toMatch(/[▼·]/);
    });

    it('should render break mode with rising sand animation', () => {
      render(<AsciiIcon type="hourglass" progress={50} isBreak={true} />);
      const icon = screen.getByTestId('ascii-icon');
      // Break mode should have rising indicators (↑ or °)
      expect(icon.textContent).toMatch(/[↑°]/);
    });

    it('should show bottleneck sand expression during flow', () => {
      render(<AsciiIcon type="hourglass" progress={50} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      // Should have gradient characters at bottleneck (▓▒░)
      expect(icon.textContent).toMatch(/[▓▒░]/);
    });
  });

  describe('Tomato Icon', () => {
    it('should render tomato icon with vine', () => {
      render(<AsciiIcon type="tomato" progress={50} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon.textContent).toContain('~~~~');
      expect(icon.textContent).toContain('═');
    });

    it('should render two tomatoes', () => {
      render(<AsciiIcon type="tomato" progress={50} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      // Two tomatoes have heata (|) indicators
      const content = icon.textContent || '';
      const pipeCount = (content.match(/\|/g) || []).length;
      expect(pipeCount).toBeGreaterThanOrEqual(2);
    });

    it('should render sun animation during break', () => {
      render(<AsciiIcon type="tomato" progress={50} isBreak={true} />);
      const icon = screen.getByTestId('ascii-icon');
      // Break mode shows sun with rays or brackets
      expect(icon.textContent).toMatch(/[\[\]]/);
    });

    it('should render work mode without sun', () => {
      render(<AsciiIcon type="tomato" progress={50} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      // Work mode should NOT have sun brackets at the top
      const lines = icon.textContent?.split('\n') || [];
      expect(lines[0]).not.toContain('[');
    });
  });

  describe('Coffee Icon', () => {
    it('should render coffee cup with handle', () => {
      render(<AsciiIcon type="coffee" progress={50} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon.textContent).toContain('╭');
      expect(icon.textContent).toContain('╯');
      // Handle indicators
      expect(icon.textContent).toContain('├');
    });

    it('should show steam during work mode with enough coffee', () => {
      // At 30% progress, coffee is 70% full -> steam should show
      render(<AsciiIcon type="coffee" progress={30} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon.textContent).toMatch(/[～~]/);
    });

    it('should hide steam when coffee is low', () => {
      // At 80% progress, coffee is 20% full -> steam should NOT show
      render(<AsciiIcon type="coffee" progress={80} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      const lines = icon.textContent?.split('\n') || [];
      // First few lines (steam area) should be empty or have no steam
      const steamArea = lines.slice(0, 3).join('');
      // Should not have steam characters in significant quantity
      const steamCount = (steamArea.match(/[～~]/g) || []).length;
      expect(steamCount).toBeLessThan(4);
    });

    it('should show pouring animation during break', () => {
      render(<AsciiIcon type="coffee" progress={50} isBreak={true} />);
      const icon = screen.getByTestId('ascii-icon');
      // Pouring animation has vertical bars or arrows
      expect(icon.textContent).toMatch(/[│▼▽╲╱]/);
    });
  });

  describe('Progress Icon', () => {
    it('should render progress bar', () => {
      render(<AsciiIcon type="progress" progress={50} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon.textContent).toContain('[');
      expect(icon.textContent).toContain(']');
    });

    it('should show filled portion based on progress', () => {
      render(<AsciiIcon type="progress" progress={50} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon.textContent).toContain('█');
      expect(icon.textContent).toContain('░');
    });

    it('should show full bar at 100% progress', () => {
      render(<AsciiIcon type="progress" progress={100} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      // Should be all filled, no empty
      const content = icon.textContent || '';
      const emptyCount = (content.match(/░/g) || []).length;
      expect(emptyCount).toBe(0);
    });

    it('should show empty bar at 0% progress', () => {
      render(<AsciiIcon type="progress" progress={0} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      // Should be all empty, no filled
      const content = icon.textContent || '';
      const filledCount = (content.match(/█/g) || []).length;
      expect(filledCount).toBe(0);
    });

    it('should show refill indicator during break', () => {
      render(<AsciiIcon type="progress" progress={50} isBreak={true} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon.textContent).toContain('REFILL');
    });
  });

  describe('None Icon', () => {
    it('should render empty for none icon', () => {
      render(<AsciiIcon type="none" progress={50} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon.textContent?.trim()).toBe('');
    });
  });

  describe('Progress calculations', () => {
    it('should handle 0 progress (start of timer)', () => {
      render(<AsciiIcon type="hourglass" progress={0} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon).toBeDefined();
    });

    it('should handle 100 progress (end of timer)', () => {
      render(<AsciiIcon type="hourglass" progress={100} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon).toBeDefined();
    });

    it('should handle edge case near 0', () => {
      render(<AsciiIcon type="hourglass" progress={0.5} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon).toBeDefined();
    });

    it('should handle edge case near 100', () => {
      render(<AsciiIcon type="hourglass" progress={99.5} isBreak={false} />);
      const icon = screen.getByTestId('ascii-icon');
      expect(icon).toBeDefined();
    });
  });
});

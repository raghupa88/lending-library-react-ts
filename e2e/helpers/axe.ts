import AxeBuilder from '@axe-core/playwright';
import { expect, Page } from '@playwright/test';

/**
 * Fail the test on any WCAG 2.x A/AA violation on the current page.
 * Use after the page has reached its settled state.
 */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(
    results.violations,
    results.violations
      .map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)
      .join('\n'),
  ).toEqual([]);
}

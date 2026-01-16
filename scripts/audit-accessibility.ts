import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface AccessibilityIssue {
  file: string;
  line: number;
  type: 'missing-alt' | 'missing-aria' | 'missing-label' | 'poor-contrast' | 'no-keyboard' | 'missing-role';
  severity: 'critical' | 'high' | 'medium' | 'low';
  element: string;
  suggestion: string;
}

async function auditAccessibility(dir: string): Promise<AccessibilityIssue[]> {
  const issues: AccessibilityIssue[] = [];

  async function scanDirectory(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!entry.name.includes('node_modules') && !entry.name.includes('dist')) {
          await scanDirectory(fullPath);
        }
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
        await scanFile(fullPath);
      }
    }
  }

  async function scanFile(filePath: string): Promise<void> {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for images without alt text
      if (line.includes('<img') && !line.includes('alt=')) {
        issues.push({
          file: filePath,
          line: index + 1,
          type: 'missing-alt',
          severity: 'critical',
          element: line.trim(),
          suggestion: 'Add alt attribute to image for screen readers',
        });
      }

      // Check for buttons without aria-label
      if (line.includes('<button') && !line.includes('aria-label') && !line.includes('children')) {
        if (line.includes('icon') || line.includes('Icon')) {
          issues.push({
            file: filePath,
            line: index + 1,
            type: 'missing-aria',
            severity: 'high',
            element: line.trim(),
            suggestion: 'Add aria-label to icon button for screen readers',
          });
        }
      }

      // Check for inputs without labels
      if (line.includes('<input') && !line.includes('aria-label') && !line.includes('id=')) {
        issues.push({
          file: filePath,
          line: index + 1,
          type: 'missing-label',
          severity: 'high',
          element: line.trim(),
          suggestion: 'Add label or aria-label to input field',
        });
      }

      // Check for divs with onClick without role
      if (line.includes('onClick') && line.includes('<div') && !line.includes('role=')) {
        issues.push({
          file: filePath,
          line: index + 1,
          type: 'missing-role',
          severity: 'high',
          element: line.trim(),
          suggestion: 'Add role="button" and keyboard event handlers',
        });
      }

      // Check for links without descriptive text
      if (line.includes('<a') && (line.includes('>Click here<') || line.includes('>Read more<'))) {
        issues.push({
          file: filePath,
          line: index + 1,
          type: 'missing-aria',
          severity: 'medium',
          element: line.trim(),
          suggestion: 'Use descriptive link text instead of "Click here"',
        });
      }
    });
  }

  await scanDirectory(dir);
  return issues;
}

async function main() {
  console.log('🔍 Auditing Accessibility Issues...\n');

  const issues = await auditAccessibility('src');

  // Group by severity
  const bySeverity = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low'),
  };

  console.log('📊 Summary:');
  console.log(`Total Issues: ${issues.length}`);
  console.log(`Critical: ${bySeverity.critical.length}`);
  console.log(`High: ${bySeverity.high.length}`);
  console.log(`Medium: ${bySeverity.medium.length}`);
  console.log(`Low: ${bySeverity.low.length}`);
  console.log('\n');

  // Print critical issues
  if (bySeverity.critical.length > 0) {
    console.log('🔴 CRITICAL Issues (Fix First):');
    bySeverity.critical.slice(0, 10).forEach(issue => {
      console.log(`  ${issue.file}:${issue.line}`);
      console.log(`    Type: ${issue.type}`);
      console.log(`    Suggestion: ${issue.suggestion}`);
      console.log('');
    });
  }

  // Save full report
  await writeFile(
    'accessibility-audit-report.json',
    JSON.stringify({ issues, summary: bySeverity }, null, 2)
  );

  console.log('📄 Full report saved to: accessibility-audit-report.json');
}

main().catch(console.error);

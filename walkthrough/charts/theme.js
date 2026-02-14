export function getChartTheme() {
  const styles = getComputedStyle(document.body);
  return {
    text: styles.getPropertyValue('--text').trim() || '#24324d',
    muted: styles.getPropertyValue('--muted').trim() || '#7182a3',
    primary: styles.getPropertyValue('--primary').trim() || '#3b82f6',
    success: styles.getPropertyValue('--success').trim() || '#22b8a9',
    warning: styles.getPropertyValue('--warning').trim() || '#f2b98f',
    border: styles.getPropertyValue('--border').trim() || '#dce3f1'
  };
}

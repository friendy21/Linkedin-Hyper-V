/**
 * Action timing and delays
 * Enforces realistic delays between actions to mimic human behavior
 */

export type ActionType = 'message' | 'connection' | 'navigation' | 'search' | 'profile_view' | 'typing';

interface TimingRange {
  min: number;
  max: number;
}

/**
 * Timing ranges for different action types (in milliseconds)
 * These represent human think-time and action preparation time
 */
const ACTION_TIMINGS: Record<ActionType, TimingRange> = {
  // Quick navigation between pages
  navigation: { min: 2000, max: 5000 },
  
  // Search takes time to review results
  search: { min: 3000, max: 8000 },
  
  // Profile viewing (reading content)
  profile_view: { min: 5000, max: 15000 },
  
  // Composing a message requires thought
  message: { min: 8000, max: 20000 },
  
  // Connection requests also require consideration
  connection: { min: 10000, max: 30000 },
  
  // Typing pauses between fields
  typing: { min: 500, max: 2000 },
};

/**
 * Generates a random delay using log-normal distribution
 * Log-normal creates a more realistic human timing pattern than uniform
 * 
 * @param min - Minimum delay in ms
 * @param max - Maximum delay in ms
 * @returns Random delay between min and max
 */
function logNormalDelay(min: number, max: number): number {
  // Generate log-normal random value
  const u = Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  
  // Scale to desired range with bias toward middle values
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 6;
  
  let delay = mean + z * stdDev;
  
  // Clamp to range
  delay = Math.max(min, Math.min(max, delay));
  
  return Math.round(delay);
}

/**
 * Enforces a delay between actions
 * 
 * @param actionType - Type of action being performed
 * @param customRange - Optional custom timing range (overrides defaults)
 */
export async function actionDelay(
  actionType: ActionType,
  customRange?: TimingRange
): Promise<void> {
  const range = customRange ?? ACTION_TIMINGS[actionType];
  const delay = logNormalDelay(range.min, range.max);
  
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Short random delay for minor actions
 * Use this for small pauses that don't need full think-time
 * 
 * @param baseMs - Base delay in milliseconds
 */
export async function microDelay(baseMs: number = 500): Promise<void> {
  const variance = baseMs * 0.3;
  const delay = baseMs + (Math.random() - 0.5) * 2 * variance;
  await new Promise(resolve => setTimeout(resolve, Math.max(100, delay)));
}

/**
 * Delay specifically for reading/scrolling operations
 * Mimics time spent reading content on a page
 * 
 * @param contentLength - Approximate content length (affects reading time)
 */
export async function readingDelay(contentLength: number = 500): Promise<void> {
  // Base reading time: ~200ms per 100 characters
  const baseTime = (contentLength / 100) * 200;
  const min = Math.max(2000, baseTime * 0.5);
  const max = Math.min(30000, baseTime * 2);
  
  await actionDelay('profile_view', { min, max });
}

/**
 * Generates a randomized daily schedule for an account
 * Returns the next available action time based on business hours
 * 
 * @param timezone - Account timezone
 * @returns Time until next valid action window in ms
 */
export function getNextActionWindow(timezone: string): number {
  const now = new Date();
  const options: Intl.DateTimeTimeZoneOptions = { timeZone: timezone };
  
  // Get current hour in account timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    ...options,
    hour: 'numeric',
    hour12: false,
  });
  const hour = parseInt(formatter.format(now), 10);
  
  // Business hours: 9 AM to 7 PM
  const startHour = 9;
  const endHour = 19;
  
  if (hour >= startHour && hour < endHour) {
    // Within business hours - can proceed
    return 0;
  }
  
  // Outside business hours - calculate wait time
  const nextDay = new Date(now);
  if (hour >= endHour) {
    // After hours, wait until tomorrow
    nextDay.setDate(nextDay.getDate() + 1);
  }
  nextDay.setHours(startHour, 0, 0, 0);
  
  return nextDay.getTime() - now.getTime();
}

/**
 * Check if current time is within acceptable action hours
 * 
 * @param timezone - Account timezone
 * @returns Whether actions should proceed
 */
export function isWithinActionWindow(timezone: string): boolean {
  return getNextActionWindow(timezone) === 0;
}

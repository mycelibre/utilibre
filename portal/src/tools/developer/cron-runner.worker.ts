import { parseCronExpression, searchNextCronRuns } from './cron';

interface CronWorkerRequest {
  id: string;
  expression: string;
  after: number;
  count: number;
}

self.addEventListener('message', (event: MessageEvent<CronWorkerRequest>) => {
  const { id, expression, after, count } = event.data;
  try {
    const schedule = parseCronExpression(expression);
    const result = searchNextCronRuns(schedule, new Date(after), { count });
    self.postMessage({ id, ok: true, dates: result.runs.map((date) => date.toISOString()), complete: result.complete });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : 'The cron expression could not be evaluated.' });
  }
});

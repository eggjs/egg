import path from 'node:path';
import fs from 'node:fs';

export function getFixtures(name: string): string {
  return path.join(import.meta.dirname, 'fixtures', name);
}

export function getCoreLogContent(name: string): string {
  const logPath = getFixtures(`${name}/logs/${name}/egg-web.log`);
  return fs.readFileSync(logPath, 'utf8');
}

export function getLogContent(name: string): string {
  const logPath = getFixtures(`${name}/logs/${name}/${name}-web.log`);
  return fs.readFileSync(logPath, 'utf8');
}

export function getAgentLogContent(name: string): string {
  const logPath = getFixtures(`${name}/logs/${name}/egg-agent.log`);
  return fs.readFileSync(logPath, 'utf8');
}

export function getScheduleLogContent(name: string): string {
  const logPath = getFixtures(`${name}/logs/${name}/egg-schedule.log`);
  return fs.readFileSync(logPath, 'utf8');
}

export function contains(content: string, match: string | RegExp): number {
  return content.split('\n').filter(line => {
    return match instanceof RegExp ? match.test(line) : line.indexOf(match) >= 0;
  }).length;
}

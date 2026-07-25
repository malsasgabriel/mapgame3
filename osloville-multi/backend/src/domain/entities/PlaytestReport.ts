export type PlaytestSeverity = 'blocker' | 'major' | 'minor' | 'idea';
export type PlaytestStatus = 'new' | 'triaged' | 'fixed' | 'wont_fix';

export interface PlaytestReport {
  id: string;
  playerId: string;
  playerName: string;
  category: string;
  severity: PlaytestSeverity;
  title: string;
  reproduction: string;
  diagnostics: Record<string, unknown>;
  status: PlaytestStatus;
  createdAt: Date;
}

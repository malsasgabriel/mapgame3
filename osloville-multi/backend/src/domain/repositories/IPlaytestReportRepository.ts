import { PlaytestReport } from '../entities/PlaytestReport';

export interface IPlaytestReportRepository {
  create(report: PlaytestReport): Promise<PlaytestReport>;
  getRecent(limit: number): Promise<PlaytestReport[]>;
}

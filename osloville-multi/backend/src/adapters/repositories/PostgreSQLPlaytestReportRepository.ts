import { PlaytestReport, PlaytestSeverity, PlaytestStatus } from '../../domain/entities/PlaytestReport';
import { IPlaytestReportRepository } from '../../domain/repositories/IPlaytestReportRepository';
import * as db from '../../infrastructure/db/connection';

export class PostgreSQLPlaytestReportRepository implements IPlaytestReportRepository {
  private mapRow(row: Record<string, unknown>): PlaytestReport {
    const diagnostics = row.diagnostics;
    return {
      id: String(row.id),
      playerId: String(row.player_id),
      playerName: String(row.player_name),
      category: String(row.category),
      severity: row.severity as PlaytestSeverity,
      title: String(row.title),
      reproduction: String(row.reproduction),
      diagnostics: typeof diagnostics === 'string' ? JSON.parse(diagnostics) : (diagnostics as Record<string, unknown>) || {},
      status: row.status as PlaytestStatus,
      createdAt: new Date(String(row.created_at)),
    };
  }

  async create(report: PlaytestReport): Promise<PlaytestReport> {
    const result = await db.query(
      `INSERT INTO playtest_reports
        (id, player_id, player_name, category, severity, title, reproduction, diagnostics, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        report.id, report.playerId, report.playerName, report.category, report.severity,
        report.title, report.reproduction, JSON.stringify(report.diagnostics), report.status, report.createdAt,
      ],
    );
    return this.mapRow(result.rows[0]);
  }

  async getRecent(limit: number): Promise<PlaytestReport[]> {
    const result = await db.query(
      'SELECT * FROM playtest_reports ORDER BY created_at DESC LIMIT $1',
      [Math.max(1, Math.min(limit, 100))],
    );
    return result.rows.map(row => this.mapRow(row));
  }
}

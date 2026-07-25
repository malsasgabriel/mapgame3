export interface IWorldPickupRepository {
  /** Atomically marks a daily shared pickup as claimed. */
  claim(day: string, itemId: string, playerId: string): Promise<boolean>;
  release(day: string, itemId: string): Promise<void>;
  getClaimedItemIds(day: string): Promise<string[]>;
}

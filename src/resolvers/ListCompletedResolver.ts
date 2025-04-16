export class ListCompletedResolver {
    static async list(): Promise<Array<{ id: string; completedAt: string; file: string }>> {
      // TODO: list finished recordings
      return [];
    }
  }
  
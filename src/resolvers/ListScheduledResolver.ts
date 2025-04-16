export class ListScheduledResolver {
    static async list(): Promise<Array<{ id: string; startTime: string; user: string }>> {
      // TODO: list future scheduled jobs
      return [];
    }
  }
  
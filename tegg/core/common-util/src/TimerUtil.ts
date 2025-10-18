export class TimerUtil {
  static async sleep(ms: number) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
}

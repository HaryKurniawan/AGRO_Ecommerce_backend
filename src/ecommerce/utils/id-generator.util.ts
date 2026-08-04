export class IdGenerator {
  /**
   * Generates a semantic invoice number.
   * Format: INV-{YYMMDD}-{KODETOKO}-{SEQ}
   */
  static generateInvoiceNumber(kodeToko: string, sequence: number): string {
    const date = new Date();
    const yy = date.getFullYear().toString().slice(2);
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    const seq = sequence.toString().padStart(4, "0");
    const safeKodeToko = kodeToko || "TKO";
    return `INV-${yy}${mm}${dd}-${safeKodeToko}-${seq}`;
  }

  /**
   * Generates a semantic shipping tracking number.
   * Format: TRK-{YYMMDD}-{SEQ}
   */
  static generateTrackingNumber(sequence: number): string {
    const date = new Date();
    const yy = date.getFullYear().toString().slice(2);
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    const seq = sequence.toString().padStart(4, "0");
    return `TRK-${yy}${mm}${dd}-${seq}`;
  }

  /**
   * Generates a semantic store code.
   * Format: TKO-{WILAYAH}-{SEQ}
   */
  static generateStoreCode(wilayah: string, sequence: number): string {
    const safeWilayah = wilayah ? wilayah.substring(0, 3).toUpperCase() : "GEN";
    const seq = sequence.toString().padStart(3, "0");
    return `TKO-${safeWilayah}-${seq}`;
  }

  /**
   * Generates a semantic stock request number.
   * Format: REQ-STK-{KODETOKO}-{YYMMDD}-{SEQ}
   */
  static generateStockRequestNumber(kodeToko: string, sequence: number): string {
    const date = new Date();
    const yy = date.getFullYear().toString().slice(2);
    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    const seq = sequence.toString().padStart(3, "0");
    const safeKodeToko = kodeToko || "TKO";
    return `REQ-STK-${safeKodeToko}-${yy}${mm}${dd}-${seq}`;
  }
}

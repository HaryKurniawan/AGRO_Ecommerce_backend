export interface ProductHistoryItem {
  produkGudangId: string;
  namaProduk: string;
  lastRequestDate: Date;
  totalRequests: number;
  totalQuantityRequested: number;
  totalQuantityApproved: number;
  lastStatus: string;
  gudangId: string;
}

import { Controller, Sse, Query } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent, map, filter } from 'rxjs';

interface SsePayload {
  orderId: string;
  status: string;
  tokoId: string;
}

@Controller('ecom/pesanan-events')
export class PesananEventsController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Sse('stream')
  stream(
    @Query('userId') userId?: string,
    @Query('tokoId') tokoId?: string,
    @Query('kurirId') kurirId?: string
  ): Observable<any> {
    return fromEvent(this.eventEmitter, 'order.status.updated').pipe(
      filter((payload: SsePayload) => {
        // If tokoId is provided, only send events for that toko
        if (tokoId && payload.tokoId === tokoId) {
          return true;
        }
        
        // If it's a generic listener (like customer or courier without specific toko payload info),
        // we allow the event through. The client-side react-query will refetch and see if it belongs to them.
        // In a production environment with strict security, we'd include userId and kurirId in the payload 
        // to filter precisely.
        if (!tokoId) {
            return true;
        }

        return false;
      }),
      map((payload: SsePayload) => {
        return {
          data: payload,
        };
      }),
    );
  }
}

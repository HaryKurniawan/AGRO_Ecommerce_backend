import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

@Injectable()
export class NotifSseService {
  // Map: userId -> Set<Subject> (one user might have multiple tabs open)
  private connections = new Map<string, Set<Subject<MessageEvent>>>();

  addConnection(userId: string, subject: Subject<MessageEvent>) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(subject);
  }

  removeConnection(userId: string, subject: Subject<MessageEvent>) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(subject);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  // Push to a single user
  emitToUser(userId: string, payload: any) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.forEach((subject) => {
        subject.next({ data: payload } as MessageEvent);
      });
    }
  }

  // Push to multiple users
  emitToUsers(userIds: string[], payload: any) {
    userIds.forEach((id) => this.emitToUser(id, payload));
  }
}

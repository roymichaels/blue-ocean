import { EventEmitter } from 'events';
import DatabaseService from '../services/database';
import { ChatRoom } from '../types';
import { normalizeMessage } from '../lib/normalizeMessage';

class ChatAgent {
  private emitter = new EventEmitter();

  private getRoomId(buyerAddress: string, sellerAddress: string) {
    return `${buyerAddress}-${sellerAddress}`;
  }

  async openChat(
    buyerAddress: string,
    sellerAddress: string,
    sellerName: string,
    sellerPublicKey?: string,
  ) {
    const roomId = this.getRoomId(buyerAddress, sellerAddress);
    const db = DatabaseService.getInstance();
    await db.getOrCreateChatRoom(
      sellerAddress,
      sellerName,
      sellerPublicKey,
      roomId,
    );
    const room = normalizeMessage<ChatRoom>('ChatRoom', {
      id: roomId,
      userId: sellerAddress,
      userName: sellerName,
      userPublicKey: sellerPublicKey,
      lastMessage: '',
      lastMessageTime: Date.now(),
      unreadCount: 0,
    });
    this.emitter.emit('open', room);
  }

  onOpen(cb: (room: ChatRoom) => void) {
    this.emitter.on('open', cb);
    return () => this.emitter.off('open', cb);
  }
}

export default new ChatAgent();

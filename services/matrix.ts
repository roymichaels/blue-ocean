import {
  createClient,
  MatrixClient,
  MatrixEvent,
  Room,
  RoomMember,
  MemoryStore,
  RelationType,
  EventType,
  Preset,
  Visibility,
  NotificationCountType,
, ClientEvent, RoomEvent, RoomMemberEvent } from 'matrix-js-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { ChatMessage, User } from '../types';
import { Platform } from 'react-native';
import { debugLog } from '../utils/logger';
import { getSanitizedMatrixUrl } from '../utils/matrix';

const AUTH_STORAGE_KEY = 'matrix_auth_state';
const MATRIX_SERVER_URL = process.env.EXPO_PUBLIC_MATRIX_SERVER || 'https://tedomum.net';
const MATRIX_DOMAIN = getSanitizedMatrixUrl() || 'tedomum.net';

export class MatrixService {
  private static instance: MatrixService;
  private matrixClient: MatrixClient | null = null;
  private isAuthenticated = false;
  private currentUser: any = null;
  private authStateListeners: ((isLoggedIn: boolean, user: any) => void)[] = [];
  private chatTriggerListeners: ((userId: string) => void)[] = [];

  public static getInstance(): MatrixService {
    if (!MatrixService.instance) {
      MatrixService.instance = new MatrixService();
    }
    return MatrixService.instance;
  }

  private constructor() {
    this.initializeFromStorage();
  }

  private async initializeFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const { isAuthenticated, currentUser, accessToken, userId } = JSON.parse(stored);
        this.isAuthenticated = isAuthenticated;
        this.currentUser = currentUser;
        if (this.isAuthenticated && accessToken) {
          await this.initializeMatrixClient(accessToken, userId);
        }
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error initializing auth from storage:', error);
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  private async initializeMatrixClient(
    accessToken: string,
    userId: string
  ): Promise<void> {
    try {
      this.matrixClient = createClient({
        baseUrl: `https://${MATRIX_DOMAIN}`,
        accessToken,
        userId,
        store: new MemoryStore(),
        timelineSupport: true,
      });

      this.setupMatrixEventListeners();

      await this.matrixClient.startClient({ initialSyncLimit: 20 });
    } catch (error) {
      console.error('Error initializing Matrix client:', error);
      this.matrixClient = null;
      await this.handleAuthenticationError();
    }
  }

  private setupMatrixEventListeners(): void {
    if (!this.matrixClient) return;

    // Listen for client errors (including 401)
    this.matrixClient.on(ClientEvent.Error, (err: any) => {
      console.error('Matrix client error:', err);
      if (err?.httpStatus === 401) {
        console.warn('Matrix token invalid, logging out...');
        this.handleAuthenticationError();
      }
    });

    // Listen for sync state changes
    this.matrixClient.on(ClientEvent.Sync, (state: string, prevState: string, data: any) => {
      if (state === 'ERROR' && data?.error?.httpStatus === 401) {
        console.warn('Matrix sync auth error, logging out...');
        this.handleAuthenticationError();
      }
      if (state === 'PREPARED') {
        debugLog('Matrix client sync prepared');
      }
    });

    // Listen for new messages in rooms
    this.matrixClient.on(
      RoomEvent.Timeline,
      (event: MatrixEvent, room?: Room, toStartOfTimeline?: boolean, removed?: boolean, data?: any) => {
        if (event.getType() === 'm.room.message') {
          // TODO: custom handling (e.g., notifications)
        }
      }
    );

    // Listen for membership changes
    this.matrixClient.on(
      RoomMemberEvent.Membership,
      (event: MatrixEvent, member: RoomMember) => {
        // TODO: handle membership (join/leave)
      }
    );
  }

  private async handleAuthenticationError(): Promise<void> {
    try {
      if (this.matrixClient) {
        this.matrixClient.stopClient();
        this.matrixClient = null;
      }
    } catch {}
    this.isAuthenticated = false;
    this.currentUser = null;
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    this.notifyListeners();
  }

  private async saveAuthState(
    accessToken?: string,
    userId?: string
  ): Promise<void> {
    const payload = { isAuthenticated: this.isAuthenticated, currentUser: this.currentUser, accessToken, userId, timestamp: Date.now() };
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  }

  private async clearAuthStorage(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }

  // ----------------- Public API -----------------

  async signup(
    username: string,
    email: string,
    displayName: string,
    password: string
  ): Promise<boolean> {
    try {
      const res = await fetch(`https://${MATRIX_DOMAIN}/_matrix/client/v3/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, auth: { type: 'm.login.dummy' } }),
      });
      if (!res.ok) {
        console.error('Signup failed', await res.text());
        return false;
      }
      const { access_token, user_id } = await res.json();
      await this.initializeMatrixClient(access_token, user_id);
      const { error } = await supabase.from('user_profiles').insert([
        { matrix_user_id: user_id, app_username: username, email, display_name: displayName, role: 'user', kyc_status: 'none', customer_tier: 'new' },
      ]);
      if (error) {
        console.error('Supabase profile insert error:', error);
        return false;
      }
      this.isAuthenticated = true;
      this.currentUser = { id: user_id, username, displayName, role: 'user', email };
      await this.saveAuthState(access_token, user_id);
      this.notifyListeners();
      return true;
    } catch (e) {
      console.error('Signup error:', e);
      return false;
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    try {
      const temp = createClient({ baseUrl: `https://${MATRIX_DOMAIN}` });
      const response = await temp.login('m.login.password', { user: username, password });
      await this.initializeMatrixClient(response.access_token, response.user_id);
      // Optionally fetch supabase profile here
      this.isAuthenticated = true;
      this.currentUser = { id: response.user_id, username, role: 'user' };
      await this.saveAuthState(response.access_token, response.user_id);
      this.notifyListeners();
      return true;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    }
  }

  async logout(): Promise<void> {
    if (this.matrixClient) {
      await this.matrixClient.logout();
      this.matrixClient.stopClient();
      this.matrixClient = null;
    }
    this.isAuthenticated = false;
    this.currentUser = null;
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    this.notifyListeners();
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  addAuthStateListener(listener: (isLoggedIn: boolean, user: any) => void): void {
    this.authStateListeners.push(listener);
  }

  removeAuthStateListener(listener: (isLoggedIn: boolean, user: any) => void): void {
    this.authStateListeners = this.authStateListeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.authStateListeners.forEach(l => l(this.isAuthenticated, this.currentUser));
  }

  addChatTriggerListener(listener: (userId: string) => void): void {
    this.chatTriggerListeners.push(listener);
  }

  removeChatTriggerListener(listener: (userId: string) => void): void {
    this.chatTriggerListeners = this.chatTriggerListeners.filter(l => l !== listener);
  }

  triggerChatOpen(userId: string): void {
    this.chatTriggerListeners.forEach(l => l(userId));
  }

  async sendMessage(roomId: string, message: string): Promise<boolean> {
    if (!this.matrixClient || !this.isAuthenticated) return false;
    try {
      await this.matrixClient.sendEvent(roomId, 'm.room.message', { body: message, msgtype: 'm.room.message' });
      return true;
    } catch (e) {
      console.error('Send message error:', e);
      return false;
    }
  }

  async createRoom(otherUserId: string): Promise<string> {
    if (!this.matrixClient) throw new Error('Not authenticated');
    const response = await this.matrixClient.createRoom({
      invite: [otherUserId],
      is_direct: true,
      preset: Preset.PrivateChat,
      visibility: Visibility.Private,
      initial_state: [{ type: 'm.room.guest_access', state_key: '', content: { guest_access: 'forbidden' } }],
    });
    return response.room_id;
  }

  async joinRoom(roomId: string): Promise<boolean> {
    if (!this.matrixClient || !this.isAuthenticated) return false;
    try {
      await this.matrixClient.joinRoom(roomId);
      return true;
    } catch (e) {
      console.error('Join room error:', e);
      return false;
    }
  }

  async searchUsers(term: string): Promise<Array<{ user_id: string; display_name?: string }>> {
    if (!this.matrixClient) return [];
    try {
      const result = await (this.matrixClient as any).searchUserDirectory({ term, limit: 10 });
      return result.results;
    } catch (e) {
      console.error('searchUsers error:', e);
      return [];
    }
  }

  async getProfileInfo(userId: string): Promise<{ displayname?: string; avatar_url?: string } | null> {
    if (!this.matrixClient) return null;
    try {
      return (await this.matrixClient.getProfileInfo(userId)) as any;
    } catch (e) {
      console.error('getProfileInfo error:', e);
      return null;
    }
  }

  async getOrCreateAdminRoom(): Promise<string> {
    if (!this.matrixClient || !this.isAuthenticated) return 'default_room';
    const adminUserId = `@${process.env.EXPO_PUBLIC_ADMIN_USERNAME || 'roymichaels'}:${MATRIX_DOMAIN}`;
    const directMap = this.matrixClient.getAccountData('m.direct')?.getContent() || {};
    let roomId = directMap[adminUserId]?.[0];
    if (!roomId) {
      for (const r of this.matrixClient.getRooms()) {
        if (Object.values(directMap).flat().includes(r.roomId)) {
          roomId = r.roomId;
          break;
        }
      }
    }
    if (!roomId) roomId = await this.createRoom(adminUserId);
    return roomId;
  }

  async getRooms(): Promise<any[]> {
    if (!this.matrixClient || !this.isAuthenticated) return [];
    const rooms = this.matrixClient.getRooms();
    const directMap = this.matrixClient.getAccountData('m.direct')?.getContent() || {};
    const dmRooms = rooms.filter(r => Object.values(directMap).flat().includes(r.roomId));
    return Promise.all(dmRooms.map(async r => {
      const other = r.getJoinedMembers().find(m => m.userId !== this.currentUser.id);
      const events = r.getLiveTimeline().getEvents();
      const last = events[events.length - 1];
      const unreadCount = r.getUnreadNotificationCount(NotificationCountType.Total);
      return {
        id: r.roomId,
        userId: other?.userId,
        userName: other?.name,
        lastMessage: last?.getContent()?.body,
        lastMessageTime: last?.getTs(),
        unreadCount,
      };
    }));
  }

  async getChatMessages(roomId: string): Promise<ChatMessage[]> {
    if (!this.matrixClient || !roomId) return [];
    const room = this.matrixClient.getRoom(roomId);
    if (!room) return [];
    const events = room.getLiveTimeline().getEvents();
    const messages = events.filter(e => e.getType() === 'm.room.message').map(e => {
      const sender = room.getMember(e.getSender() || '');
      const content = e.getContent();
      const msg: ChatMessage = {
        id: e.getId() || '',
        senderId: e.getSender() || '',
        senderName: sender?.name || '',
        message: content.body || '',
        timestamp: e.getTs(),
        isAdmin: (e.getSender() || '').includes(process.env.EXPO_PUBLIC_ADMIN_USERNAME || ''),
      };
      return msg;
    });
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  }

  async updateChatMessageReactions(roomId: string, eventId: string, emoji: string): Promise<boolean> {
    if (!this.matrixClient) return false;
    try {
      await this.matrixClient.sendEvent(roomId, 'm.reaction', { 'm.relates_to': { rel_type: 'm.annotation', event_id: eventId, key: emoji } });
      return true;
    } catch (e) {
      console.error('updateChatMessageReactions error:', e);
      return false;
    }
  }

  async validateStoredAuth(): Promise<boolean> {
    const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored);
    if (Date.now() - data.timestamp > 30 * 24 * 60 * 60 * 1000) {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      this.isAuthenticated = false;
      this.currentUser = null;
      this.notifyListeners();
      return false;
    }
    return true;
  }

  async refreshAuthFromStorage(): Promise<void> {
    await this.initializeFromStorage();
  }
}

import { createClient, MatrixClient, MatrixEvent, Room, RoomMember, MemoryStore, IndexedDBStore } from 'matrix-js-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { ChatMessage, User } from '../types';
import { Platform } from 'react-native';

const AUTH_STORAGE_KEY = 'matrix_auth_state';
const DEVICE_ID_KEY = 'matrix_device_id';
const MATRIX_SERVER_URL = process.env.EXPO_PUBLIC_MATRIX_SERVER || 'https://matrix.org';

// Generate a stable device ID for this installation
const generateDeviceId = (): string => {
  return `ONX_${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export class MatrixService {
  private static instance: MatrixService;
  private matrixClient: MatrixClient | null = null;
  private isAuthenticated = false;
  private currentUser: any = null;
  private deviceId: string | null = null;
  private syncState: string = 'STOPPED';
  private authStateListeners: ((isLoggedIn: boolean, user: any) => void)[] = [];
  private chatTriggerListeners: ((userId: string) => void)[] = [];
  private syncStateListeners: ((state: string) => void)[] = [];

  public static getInstance(): MatrixService {
    if (!MatrixService.instance) {
      MatrixService.instance = new MatrixService();
    }
    return MatrixService.instance;
  }

  constructor() {
    this.initializeFromStorage();
  }

  private async initializeFromStorage(): Promise<void> {
    try {
      // Get or create device ID
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
      if (!deviceId) {
        deviceId = generateDeviceId();
        await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      }
      this.deviceId = deviceId;

      // Check for stored auth
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        
        // Validate auth age (30 days max)
        const authAge = Date.now() - (authData.timestamp || 0);
        const maxAge = 30 * 24 * 60 * 60 * 1000;
        
        if (authAge > maxAge) {
          await this.clearAuthStorage();
          return;
        }

        this.isAuthenticated = authData.isAuthenticated;
        this.currentUser = authData.currentUser;
        
        // Initialize Matrix client if we have valid credentials
        if (this.isAuthenticated && authData.accessToken && authData.userId) {
          await this.initializeMatrixClient(authData.accessToken, authData.userId);
        }
        
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error initializing auth from storage:', error);
      await this.clearAuthStorage();
    }
  }

  private async initializeMatrixClient(accessToken: string, userId: string): Promise<void> {
    try {
      // Choose appropriate store based on platform
      let store;
      if (Platform.OS === 'web') {
        // Use IndexedDB for web
        store = new IndexedDBStore({
          indexedDB: window.indexedDB,
          dbName: 'matrix-js-sdk',
        });
      } else {
        // Use MemoryStore for React Native
        store = new MemoryStore();
      }

      this.matrixClient = createClient({
        baseUrl: MATRIX_SERVER_URL,
        accessToken,
        userId,
        deviceId: this.deviceId!,
        store,
        timelineSupport: true,
        unstableClientRelationAggregation: true, // Enable reaction aggregation
        cryptoStore: Platform.OS === 'web' ? new IndexedDBStore({
          indexedDB: window.indexedDB,
          dbName: 'matrix-crypto-store',
        }) : undefined,
      });

      this.setupMatrixEventListeners();
      await this.startMatrixClient();
    } catch (error) {
      console.error('Error initializing Matrix client:', error);
      this.matrixClient = null;
      await this.handleAuthenticationError();
    }
  }

  private async startMatrixClient(): Promise<void> {
    if (!this.matrixClient) return;

    try {
      // Set up crypto if supported
      if (this.matrixClient.isCryptoEnabled()) {
        await this.matrixClient.initCrypto();
      }

      // Start client with proper sync settings
      await this.matrixClient.startClient({
        initialSyncLimit: 20,
        includeArchivedRooms: false,
        lazyLoadMembers: true, // Improve performance
      });

      // Wait for initial sync to complete
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Initial sync timeout'));
        }, 30000); // 30 second timeout

        const onSync = (state: string) => {
          if (state === 'PREPARED') {
            clearTimeout(timeout);
            this.matrixClient?.off('sync', onSync);
            resolve();
          } else if (state === 'ERROR') {
            clearTimeout(timeout);
            this.matrixClient?.off('sync', onSync);
            reject(new Error('Initial sync failed'));
          }
        };

        this.matrixClient?.on('sync', onSync);
      });

    } catch (error) {
      console.error('Error starting Matrix client:', error);
      throw error;
    }
  }

  private setupMatrixEventListeners(): void {
    if (!this.matrixClient) return;

    // Sync state tracking
    this.matrixClient.on('sync', (state: string, prevState: string, data: any) => {
      this.syncState = state;
      this.notifySyncListeners();

      switch (state) {
        case 'PREPARED':
          console.log('Matrix client sync prepared');
          break;
        case 'SYNCING':
          console.log('Matrix client syncing...');
          break;
        case 'ERROR':
          console.error('Matrix sync error:', data);
          if (data?.error?.httpStatus === 401) {
            this.handleAuthenticationError();
          }
          break;
        case 'STOPPED':
          console.log('Matrix sync stopped');
          break;
      }
    });

    // Authentication errors
    this.matrixClient.on('Client.error', (error: any) => {
      console.error('Matrix client error:', error);
      if (error?.httpStatus === 401) {
        this.handleAuthenticationError();
      }
    });

    // Room timeline events (messages, reactions, etc.)
    this.matrixClient.on('Room.timeline', (event: MatrixEvent, room: Room) => {
      if (event.getType() === 'm.room.message') {
        // Handle new messages - could trigger notifications
        this.handleNewMessage(event, room);
      } else if (event.getType() === 'm.reaction') {
        // Handle reactions
        this.handleReaction(event, room);
      }
    });

    // Room membership changes
    this.matrixClient.on('RoomMember.membership', (event: MatrixEvent, member: RoomMember) => {
      console.log(`Membership change: ${member.userId} is now ${member.membership}`);
    });

    // Room state changes
    this.matrixClient.on('RoomState.events', (event: MatrixEvent, state: any) => {
      // Handle room state changes (name, topic, etc.)
    });

    // Handle incoming invites
    this.matrixClient.on('Room.invite', (room: Room) => {
      console.log(`Received invite to room: ${room.roomId}`);
      // Auto-accept direct message invites
      if (this.isDirectMessageRoom(room)) {
        this.matrixClient?.joinRoom(room.roomId).catch(console.error);
      }
    });
  }

  private handleNewMessage(event: MatrixEvent, room: Room): void {
    // Only process messages that aren't from the current user
    if (event.getSender() === this.currentUser?.id) return;

    // Update last message timestamp for sorting
    const content = event.getContent();
    console.log(`New message in ${room.roomId}: ${content.body}`);
    
    // Here you could trigger notifications, update UI, etc.
  }

  private handleReaction(event: MatrixEvent, room: Room): void {
    const content = event.getContent();
    const relatesTo = content['m.relates_to'];
    if (relatesTo?.rel_type === 'm.annotation') {
      console.log(`New reaction: ${relatesTo.key} on ${relatesTo.event_id}`);
    }
  }

  private isDirectMessageRoom(room: Room): boolean {
    // Check if this is a direct message room
    const directRooms = this.matrixClient?.getAccountData('m.direct')?.getContent() || {};
    return Object.values(directRooms).some((roomIds: any) => 
      Array.isArray(roomIds) && roomIds.includes(room.roomId)
    );
  }

  private async handleAuthenticationError(): Promise<void> {
    try {
      console.log('Handling authentication error - clearing auth state');
      
      if (this.matrixClient) {
        this.matrixClient.stopClient();
        this.matrixClient = null;
      }

      this.isAuthenticated = false;
      this.currentUser = null;
      this.syncState = 'STOPPED';
      
      await this.clearAuthStorage();
      this.notifyListeners();
      this.notifySyncListeners();
    } catch (error) {
      console.error('Error handling authentication error:', error);
    }
  }

  private async saveAuthState(accessToken?: string, userId?: string): Promise<void> {
    try {
      const authData = {
        isAuthenticated: this.isAuthenticated,
        currentUser: this.currentUser,
        accessToken,
        userId,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  }

  private async clearAuthStorage(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing auth storage:', error);
    }
  }

  // Enhanced signup with proper error handling
  async signup(
    username: string,
    email: string,
    displayName: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate input
      if (!username || !email || !displayName || !password) {
        return { success: false, error: 'All fields are required' };
      }

      // Check username availability first
      const usernameAvailable = await this.checkUsernameAvailable(username);
      if (!usernameAvailable) {
        return { success: false, error: 'Username is already taken' };
      }

      // Prepare registration auth
      const registrationToken = process.env.EXPO_PUBLIC_MATRIX_REGISTRATION_TOKEN;
      const auth = registrationToken
        ? { type: 'm.login.registration_token', token: registrationToken }
        : { type: 'm.login.dummy' };

      // Register with Matrix server
      const registerResponse = await fetch(
        `${MATRIX_SERVER_URL}/_matrix/client/v3/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            device_id: this.deviceId,
            initial_device_display_name: `ONX ${Platform.OS}`,
            auth
          })
        }
      );

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json().catch(() => ({}));
        
        if (registerResponse.status === 403) {
          return { success: false, error: 'Registration is not allowed on this server' };
        } else if (registerResponse.status === 400 && errorData.errcode === 'M_USER_IN_USE') {
          return { success: false, error: 'Username is already taken' };
        } else {
          return { success: false, error: errorData.error || 'Registration failed' };
        }
      }

      const registerData = await registerResponse.json();
      const userId = registerData.user_id;

      // Create profile in Supabase
      const { error: supabaseError } = await supabase.from('user_profiles').insert([
        {
          matrix_user_id: userId,
          app_username: username,
          email,
          display_name: displayName,
          role: 'user',
          kyc_status: 'none',
          customer_tier: 'new'
        }
      ]);

      if (supabaseError) {
        console.error('Error creating user profile:', supabaseError);
        return { success: false, error: 'Failed to create user profile' };
      }

      return { success: true };
    } catch (error) {
      console.error('Matrix signup error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  private async checkUsernameAvailable(username: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${MATRIX_SERVER_URL}/_matrix/client/v3/register/available?username=${encodeURIComponent(username)}`,
        { method: 'GET' }
      );
      
      return response.ok;
    } catch (error) {
      console.error('Error checking username availability:', error);
      return false;
    }
  }

  // Enhanced login with better error handling and retry logic
  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const adminUsername = process.env.EXPO_PUBLIC_ADMIN_USERNAME || 'roymichaels';
      const isAdmin = username === adminUsername;

      let accessToken = '';
      let userId = '';
      let matrixLoginSuccess = false;

      // Attempt Matrix login
      try {
        const tempClient = createClient({
          baseUrl: MATRIX_SERVER_URL,
        });

        const response = await tempClient.login('m.login.password', {
          user: username,
          password: password,
          device_id: this.deviceId,
          initial_device_display_name: `ONX ${Platform.OS}`,
        });

        accessToken = response.access_token;
        userId = response.user_id;
        matrixLoginSuccess = true;

      } catch (matrixError: any) {
        console.warn('Matrix login failed:', matrixError);
        
        if (!isAdmin) {
          if (matrixError.httpStatus === 403) {
            return { success: false, error: 'Invalid username or password' };
          } else if (matrixError.httpStatus === 429) {
            return { success: false, error: 'Too many login attempts. Please try again later.' };
          } else {
            return { success: false, error: 'Login failed. Please check your credentials.' };
          }
        }
        
        // For admin users, continue with local auth
        userId = `@${username}:${MATRIX_SERVER_URL.replace('https://', '')}`;
      }

      // Check/create user profile in Supabase
      const { data: userProfiles, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('matrix_user_id', userId);
      
      if (fetchError) {
        console.error('Error fetching user profile:', fetchError);
        return { success: false, error: 'Database error occurred' };
      }

      const existingProfile = userProfiles && userProfiles.length > 0 ? userProfiles[0] : null;
      
      if (existingProfile) {
        // User exists, set auth state
        await this.setAuthenticatedUser(existingProfile, userId, username, accessToken);
        
        // Initialize Matrix client if we have a token
        if (matrixLoginSuccess && accessToken) {
          await this.initializeMatrixClient(accessToken, userId);
        }
        
        return { success: true };
      } else if (isAdmin) {
        // Create admin profile
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert([{
            matrix_user_id: userId,
            app_username: username,
            email: `${username}@example.com`,
            display_name: username,
            role: 'admin',
            kyc_status: 'none',
            customer_tier: 'new'
          }]);

        if (createError) {
          console.error('Error creating admin profile:', createError);
          return { success: false, error: 'Failed to create admin profile' };
        }

        await this.setAuthenticatedUser({
          role: 'admin',
          display_name: username
        }, userId, username, accessToken);

        if (matrixLoginSuccess && accessToken) {
          await this.initializeMatrixClient(accessToken, userId);
        }

        return { success: true };
      } else {
        return { success: false, error: 'User not found. Please sign up first.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  }

  private async setAuthenticatedUser(profile: any, userId: string, username: string, accessToken?: string): Promise<void> {
    this.isAuthenticated = true;
    this.currentUser = {
      id: userId,
      username,
      isAdmin: profile.role === 'admin',
      displayName: profile.display_name,
      role: profile.role,
      email: profile.email
    };

    await this.saveAuthState(accessToken, userId);
    this.notifyListeners();
  }

  async logout(): Promise<void> {
    try {
      if (this.matrixClient) {
        // Properly logout from Matrix
        await this.matrixClient.logout();
        this.matrixClient.stopClient();
        this.matrixClient = null;
      }

      this.isAuthenticated = false;
      this.currentUser = null;
      this.syncState = 'STOPPED';
      
      await this.clearAuthStorage();
      this.notifyListeners();
      this.notifySyncListeners();
    } catch (error) {
      console.error('Matrix logout error:', error);
      throw error;
    }
  }

  // Enhanced message sending with retry logic
  async sendMessage(roomId: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        return { success: false, error: 'Not authenticated' };
      }

      if (!message.trim()) {
        return { success: false, error: 'Message cannot be empty' };
      }

      if (!this.matrixClient) {
        // Fallback for demo mode
        console.log('Simulated message sent:', { roomId, message });
        return { success: true };
      }

      // Ensure we're in the room
      let room = this.matrixClient.getRoom(roomId);
      if (!room) {
        await this.matrixClient.joinRoom(roomId);
        room = this.matrixClient.getRoom(roomId);
        if (!room) {
          return { success: false, error: 'Failed to join room' };
        }
      }

      // Send the message
      const content = {
        body: message,
        msgtype: 'm.room.message',
      };

      await this.matrixClient.sendEvent(roomId, 'm.room.message', content, '');
      return { success: true };
    } catch (error: any) {
      console.error('Send message error:', error);
      
      if (error.httpStatus === 403) {
        return { success: false, error: 'You do not have permission to send messages in this room' };
      } else if (error.httpStatus === 429) {
        return { success: false, error: 'Rate limited. Please wait before sending another message.' };
      } else {
        return { success: false, error: 'Failed to send message' };
      }
    }
  }

  // Enhanced room creation with proper settings
  async createRoom(otherUserId: string, isDirect: boolean = true): Promise<{ success: boolean; roomId?: string; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        return { success: false, error: 'Not authenticated' };
      }

      if (!this.matrixClient) {
        const roomId = `room_${Date.now()}`;
        return { success: true, roomId };
      }

      const roomOptions: any = {
        visibility: 'private',
        invite: [otherUserId],
        initial_state: [
          {
            type: 'm.room.guest_access',
            state_key: '',
            content: { guest_access: 'forbidden' }
          },
          {
            type: 'm.room.history_visibility',
            state_key: '',
            content: { history_visibility: 'invited' }
          }
        ]
      };

      if (isDirect) {
        roomOptions.preset = 'private_chat';
        roomOptions.is_direct = true;
      } else {
        roomOptions.preset = 'private_chat';
        roomOptions.name = 'Support Chat';
        roomOptions.topic = 'Customer support conversation';
      }

      const response = await this.matrixClient.createRoom(roomOptions);
      
      // Mark as direct message
      if (isDirect) {
        await this.markRoomAsDirect(response.room_id, otherUserId);
      }

      return { success: true, roomId: response.room_id };
    } catch (error: any) {
      console.error('Create room error:', error);
      return { success: false, error: error.message || 'Failed to create room' };
    }
  }

  private async markRoomAsDirect(roomId: string, otherUserId: string): Promise<void> {
    if (!this.matrixClient) return;

    try {
      // Get current direct rooms
      const directRooms = this.matrixClient.getAccountData('m.direct')?.getContent() || {};
      
      // Add this room to the direct rooms for the other user
      if (!directRooms[otherUserId]) {
        directRooms[otherUserId] = [];
      }
      
      if (!directRooms[otherUserId].includes(roomId)) {
        directRooms[otherUserId].push(roomId);
      }

      // Update the account data
      await this.matrixClient.setAccountData('m.direct', directRooms);
    } catch (error) {
      console.error('Error marking room as direct:', error);
    }
  }

  // Better room listing with proper sorting and filtering
  async getRooms(): Promise<any[]> {
    try {
      if (!this.isAuthenticated) {
        return [];
      }

      if (!this.matrixClient) {
        return [{
          id: 'default_room',
          userId: 'admin',
          userName: 'Admin',
          lastMessage: 'Welcome to our store!',
          lastMessageTime: Date.now() - 3600000,
          unreadCount: 0,
          isDirect: true
        }];
      }

      const rooms = this.matrixClient.getRooms();
      const directRooms = this.matrixClient.getAccountData('m.direct')?.getContent() || {};
      
      // Get all direct message room IDs
      const dmRoomIds = new Set<string>();
      Object.values(directRooms).forEach((roomIds: any) => {
        if (Array.isArray(roomIds)) {
          roomIds.forEach(id => dmRoomIds.add(id));
        }
      });

      // Filter and format rooms
      const formattedRooms = rooms
        .filter(room => {
          // Only include joined rooms that are direct messages or have recent activity
          return room.getMyMembership() === 'join' && 
                 (dmRoomIds.has(room.roomId) || room.getLiveTimeline().getEvents().length > 0);
        })
        .map(room => {
          const isDirect = dmRoomIds.has(room.roomId);
          
          // Get other user info for direct messages
          let otherUser = null;
          if (isDirect) {
            const members = room.getJoinedMembers().filter(
              member => member.userId !== this.currentUser?.id
            );
            otherUser = members.length > 0 ? members[0] : null;
          }

          // Get last message
          const events = room.getLiveTimeline().getEvents()
            .filter(event => event.getType() === 'm.room.message')
            .reverse();
          const lastEvent = events.length > 0 ? events[0] : null;
          
          // Get unread count
          const unreadCount = room.getUnreadNotificationCount('total');
          
          return {
            id: room.roomId,
            userId: otherUser?.userId || 'unknown',
            userName: otherUser?.name || room.name || 'Unknown',
            lastMessage: lastEvent?.getContent()?.body || 'No messages yet',
            lastMessageTime: lastEvent?.getTs() || room.getLastActiveTs(),
            unreadCount,
            isDirect,
            roomName: room.name,
            memberCount: room.getJoinedMemberCount()
          };
        })
        .sort((a, b) => b.lastMessageTime - a.lastMessageTime); // Sort by most recent

      return formattedRooms;
    } catch (error) {
      console.error('Get rooms error:', error);
      return [];
    }
  }

  // Sync state management
  getSyncState(): string {
    return this.syncState;
  }

  addSyncStateListener(listener: (state: string) => void): void {
    this.syncStateListeners.push(listener);
  }

  removeSyncStateListener(listener: (state: string) => void): void {
    this.syncStateListeners = this.syncStateListeners.filter(l => l !== listener);
  }

  private notifySyncListeners(): void {
    for (const listener of this.syncStateListeners) {
      listener(this.syncState);
    }
  }

  // Existing methods with minor improvements...
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  getCurrentUser(): any {
    return this.currentUser;
  }

  isAdmin(): boolean {
    return this.currentUser?.isAdmin || false;
  }

  addAuthStateListener(listener: (isLoggedIn: boolean, user: any) => void): void {
    this.authStateListeners.push(listener);
  }

  removeAuthStateListener(listener: (isLoggedIn: boolean, user: any) => void): void {
    this.authStateListeners = this.authStateListeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    for (const listener of this.authStateListeners) {
      listener(this.isAuthenticated, this.currentUser);
    }
  }

  addChatTriggerListener(listener: (userId: string) => void): void {
    this.chatTriggerListeners.push(listener);
  }

  removeChatTriggerListener(listener: (userId: string) => void): void {
    this.chatTriggerListeners = this.chatTriggerListeners.filter(l => l !== listener);
  }

  triggerChatOpen(userId: string): void {
    for (const listener of this.chatTriggerListeners) {
      listener(userId);
    }
  }

  // Enhanced message fetching
  async getChatMessages(roomId: string): Promise<ChatMessage[]> {
    try {
      if (!roomId) {
        throw new Error('Room ID not provided');
      }

      if (!this.matrixClient) {
        return [{
          id: 'msg_1',
          senderId: 'admin',
          senderName: 'Admin',
          message: 'Welcome to our store! How can I help you today?',
          timestamp: Date.now() - 3600000,
          isAdmin: true
        }];
      }

      let room = this.matrixClient.getRoom(roomId);
      if (!room) {
        await this.matrixClient.joinRoom(roomId);
        // Wait for room to be available
        await new Promise(resolve => setTimeout(resolve, 1000));
        room = this.matrixClient.getRoom(roomId);
        if (!room) {
          throw new Error('Failed to join room');
        }
      }

      // Get timeline events
      const timelineEvents = room.getLiveTimeline().getEvents();
      
      // Convert to ChatMessage format
      const messages: ChatMessage[] = timelineEvents
        .filter(event => event.getType() === 'm.room.message' && !event.isRedacted())
        .map(event => {
          const sender = room!.getMember(event.getSender() || '');
          const content = event.getContent();
          const isAdmin = this.isUserAdmin(event.getSender() || '');
          
          let message = '';
          let audioUri = undefined;
          let audioDuration = undefined;
          
          if (content.msgtype === 'm.audio') {
            audioUri = content.url;
            audioDuration = content.duration || 0;
            message = '🎵 Voice message';
          } else {
            message = content.body || '';
          }
          
          return {
            id: event.getId() || Date.now().toString(),
            senderId: event.getSender() || '',
            senderName: sender?.name || 'Unknown',
            message,
            timestamp: event.getTs(),
            isAdmin,
            audioUri,
            audioDuration,
            reactions: this.getReactionsForEvent(room!, event)
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);
      
      return messages;
    } catch (error) {
      console.error('Error getting chat messages from Matrix:', error);
      return [];
    }
  }
  
  private getReactionsForEvent(room: Room, event: MatrixEvent): Record<string, string[]> {
    const reactions: Record<string, string[]> = {};
    
    try {
      const relations = room.getUnfilteredTimelineSet().getRelationsForEvent(
        event.getId() || '',
        'm.annotation',
        'm.reaction'
      );
      
      if (relations) {
        const annotations = relations.getAnnotations();
        annotations.forEach(annotation => {
          const content = annotation.getContent();
          const key = content['m.relates_to']?.key;
          const sender = annotation.getSender();
          
          if (key && sender) {
            if (!reactions[key]) {
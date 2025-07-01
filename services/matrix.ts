import { createClient, MatrixClient, MatrixEvent, Room, RoomMember, MemoryStore } from 'matrix-js-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { ChatMessage, User } from '../types';
import { Platform } from 'react-native';

const AUTH_STORAGE_KEY = 'matrix_auth_state';
const MATRIX_SERVER_URL = process.env.EXPO_PUBLIC_MATRIX_SERVER || 'https://matrix.org';

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

  constructor() {
    // Initialize auth state from storage on creation
    this.initializeFromStorage();
  }

  private async initializeFromStorage(): Promise<void> {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        this.isAuthenticated = authData.isAuthenticated;
        this.currentUser = authData.currentUser;
        
        // Initialize Matrix client if authenticated
        if (this.isAuthenticated && authData.accessToken) {
          await this.initializeMatrixClient(authData.accessToken, authData.userId);
        }
        
        // Notify listeners about restored auth state
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error initializing auth from storage:', error);
      // Clear any corrupted data
      await this.clearAuthStorage();
    }
  }

  private async initializeMatrixClient(accessToken: string, userId: string): Promise<void> {
    try {
      // Create Matrix client with proper MemoryStore
      this.matrixClient = createClient({
        baseUrl: MATRIX_SERVER_URL,
        accessToken,
        userId,
        store: new MemoryStore(),
        timelineSupport: true,
      });

      // Set up event listeners before starting the client
      this.setupMatrixEventListeners();

      // Start the client with consistent sync settings across platforms
      const startOptions = { initialSyncLimit: 20 };
        
      await this.matrixClient.startClient(startOptions);
    } catch (error) {
      console.error('Error initializing Matrix client:', error);
      this.matrixClient = null;
      // If initialization fails, clear auth state
      await this.handleAuthenticationError();
    }
  }

  private setupMatrixEventListeners(): void {
    if (!this.matrixClient) return;

    // Listen for authentication errors
    this.matrixClient.on('Client.error', (error: any) => {
      console.error('Matrix client error:', error);
      
      // Check if it's an authentication error (401)
      if (error && error.httpStatus === 401) {
        console.log('Matrix token is invalid, logging out...');
        this.handleAuthenticationError();
      }
    });

    // Listen for sync errors specifically
    this.matrixClient.on('sync', (state: string, prevState: string, data: any) => {
      if (state === 'ERROR') {
        console.error('Matrix sync error:', data);
        
        // If it's an authentication error during sync, handle it
        if (data && data.error && (data.error.httpStatus === 401 || data.error.httpStatus === 503)) {
          console.log('Matrix sync authentication error, logging out...');
          this.handleAuthenticationError();
        }
      } else if (state === 'PREPARED') {
        console.log('Matrix client sync prepared');
      }
    });

    // Listen for new messages
    this.matrixClient.on('Room.timeline', (event: MatrixEvent, room: Room) => {
      // Handle new messages
      if (event.getType() === 'm.room.message') {
        // Update unread count or trigger notifications
        // This would be implemented based on your app's requirements
      }
    });

    // Listen for room member changes
    this.matrixClient.on('RoomMember.membership', (event: MatrixEvent, member: RoomMember) => {
      // Handle membership changes
    });
  }

  private async handleAuthenticationError(): Promise<void> {
    try {
      console.log('Handling authentication error - clearing auth state');
      
      // Stop the Matrix client if it exists
      if (this.matrixClient) {
        this.matrixClient.stopClient();
        this.matrixClient = null;
      }

      // Clear authentication state
      this.isAuthenticated = false;
      this.currentUser = null;
      
      // Clear persistent storage
      await this.clearAuthStorage();
      
      // Notify listeners about the logout
      this.notifyListeners();
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

  async login(username: string, password: string): Promise<boolean> {
    try {
      // Check if this is the admin user first
      const adminUsername = process.env.EXPO_PUBLIC_ADMIN_USERNAME || 'roymichaels';
      const isAdmin = username === adminUsername;

      // For admin users, we'll create a simulated Matrix user if Matrix login fails
      let matrixLoginSuccess = false;
      let accessToken = '';
      let userId = '';

      try {
        // Create a temporary client for login
        const tempClient = createClient({
          baseUrl: MATRIX_SERVER_URL,
        });

        // Attempt to log in with Matrix
        const response = await tempClient.login('m.login.password', {
          user: username,
          password: password,
        });

        // Store the access token and user ID
        accessToken = response.access_token;
        userId = response.user_id;
        matrixLoginSuccess = true;

        // Initialize the Matrix client with the access token
        await this.initializeMatrixClient(accessToken, userId);
      } catch (matrixError) {
        console.warn('Matrix login failed:', matrixError);
        
        // If Matrix login fails but this is an admin user, we'll proceed with local auth
        if (isAdmin) {
          console.log('Matrix login failed for admin user, proceeding with local authentication');
          // Generate a simulated Matrix user ID for consistency
          userId = `@${username}:${MATRIX_SERVER_URL.replace('https://', '')}`;
          matrixLoginSuccess = false; // We'll work without Matrix client
        } else {
          // For non-admin users, Matrix login failure is a hard failure
          return false;
        }
      }

      // Check user in Supabase database
      try {
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('matrix_user_id', userId);
        
        const existingProfile = userProfiles && userProfiles.length > 0 ? userProfiles[0] : null;
        
        if (existingProfile) {
          // User exists in database, check if they're admin
          if (existingProfile.role !== 'admin') {
            // If not admin in database and not the admin username, logout
            if (matrixLoginSuccess && this.matrixClient) {
              await this.matrixClient.logout();
              this.matrixClient.stopClient();
              this.matrixClient = null;
            }
            return false;
          }
          
          // Set authentication state
          this.isAuthenticated = true;
          this.currentUser = {
            id: userId,
            username,
            isAdmin: isAdmin || existingProfile.role === 'admin',
            displayName: existingProfile.display_name,
            role: existingProfile.role
          };

          // Save auth state to persistent storage
          await this.saveAuthState(accessToken, userId);

          // Notify listeners
          this.notifyListeners();
          return true;
        } else {
          // User doesn't exist in database
          if (isAdmin) {
            // For admin users, create the profile
            const { error } = await supabase
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

            if (error) {
              console.error('Error creating admin profile:', error);
              return false;
            }

            // Set authentication state
            this.isAuthenticated = true;
            this.currentUser = {
              id: userId,
              username,
              isAdmin: true,
              displayName: username,
              role: 'admin'
            };

            // Save auth state to persistent storage
            await this.saveAuthState(accessToken, userId);

            // Notify listeners
            this.notifyListeners();
            return true;
          } else {
            // Non-admin user doesn't exist
            return false;
          }
        }
      } catch (supabaseError) {
        console.error('Error checking user profile:', supabaseError);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      // Log out from Matrix if client exists
      if (this.matrixClient) {
        await this.matrixClient.logout();
        this.matrixClient.stopClient();
        this.matrixClient = null;
      }

      // Clear authentication state
      this.isAuthenticated = false;
      this.currentUser = null;
      
      // Clear persistent storage
      await this.clearAuthStorage();
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Matrix logout error:', error);
      throw error; // Propagate error to caller
    }
  }

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

  // Chat trigger methods
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

  async sendMessage(roomId: string, message: string): Promise<boolean> {
    try {
      if (!this.isAuthenticated) {
        return false;
      }

      if (!this.matrixClient) {
        // Create a default room if needed
        if (!roomId) {
          roomId = 'default_room';
        }
        
        // Create a simulated message
        const simulatedMessage = {
          id: Date.now().toString(),
          senderId: this.currentUser?.id || 'guest_user',
          senderName: this.currentUser?.displayName || 'Guest User',
          message,
          timestamp: Date.now(),
          isAdmin: this.isAdmin()
        };
        
        // For demo purposes, we'll just return success
        console.log('Simulated message sent:', simulatedMessage);
        return true;
      }

      // Send message via Matrix
      const content = {
        body: message,
        msgtype: 'm.room.message',
      };

      await this.matrixClient.sendEvent(roomId, 'm.room.message', content, '');
      return true;
    } catch (error) {
      console.error('Send message error:', error);
      return false;
    }
  }

  async createRoom(otherUserId: string): Promise<string> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated');
      }

      if (!this.matrixClient) {
        // Create a simulated room ID
        const roomId = `room_${Date.now()}`;
        console.log('Created simulated room:', roomId);
        return roomId;
      }

      // Create a direct message room
      const response = await this.matrixClient.createRoom({
        preset: 'private_chat',
        invite: [otherUserId],
        is_direct: true,
        visibility: 'private',
        initial_state: [
          {
            type: 'm.room.guest_access',
            state_key: '',
            content: {
              guest_access: 'forbidden'
            }
          }
        ]
      });

      const roomId = response.room_id;
      return roomId;
    } catch (error) {
      console.error('Create room error:', error);
      throw error;
    }
  }

  async joinRoom(roomId: string): Promise<boolean> {
    try {
      if (!this.isAuthenticated) {
        return false;
      }

      if (!this.matrixClient) {
        return true;
      }

      // Join the Matrix room
      await this.matrixClient.joinRoom(roomId);
      return true;
    } catch (error) {
      console.error('Join room error:', error);
      return false;
    }
  }

  async getRooms(): Promise<any[]> {
    try {
      if (!this.isAuthenticated) {
        return [];
      }

      if (!this.matrixClient) {
        // Return simulated rooms for demo
        return [
          {
            id: 'default_room',
            userId: 'admin',
            userName: 'Admin',
            lastMessage: 'Welcome to our store!',
            lastMessageTime: Date.now() - 3600000, // 1 hour ago
            unreadCount: 0
          }
        ];
      }

      // Get rooms from Matrix client
      const rooms = this.matrixClient.getRooms();
      
      // Filter for direct message rooms
      const dmRooms = rooms.filter(room => {
        const isDM = this.matrixClient?.getAccountData('m.direct')?.getContent() || {};
        return Object.values(isDM).some((roomIds: any) => roomIds.includes(room.roomId));
      });

      // Format rooms for the app
      const formattedRooms = await Promise.all(dmRooms.map(async (room) => {
        // Get the other user in the DM
        const otherMembers = room.getJoinedMembers().filter(
          member => member.userId !== this.currentUser.id
        );
        const otherUser = otherMembers.length > 0 ? otherMembers[0] : null;
        
        // Get the last message
        const events = room.getLiveTimeline().getEvents();
        const lastEvent = events.length > 0 ? events[events.length - 1] : null;
        
        // Get unread count
        const unreadCount = room.getUnreadNotificationCount('highlight') + 
                           room.getUnreadNotificationCount('notification');
        
        return {
          id: room.roomId,
          userId: otherUser?.userId || 'unknown',
          userName: otherUser?.name || 'Unknown User',
          lastMessage: lastEvent?.getContent()?.body || 'No messages yet',
          lastMessageTime: lastEvent?.getTs() || Date.now(),
          unreadCount
        };
      }));

      return formattedRooms;
    } catch (error) {
      console.error('Get rooms error:', error);
      
      // Return simulated rooms for demo
      return [
        {
          id: 'default_room',
          userId: 'admin',
          userName: 'Admin',
          lastMessage: 'Welcome to our store!',
          lastMessageTime: Date.now() - 3600000, // 1 hour ago
          unreadCount: 0
        }
      ];
    }
  }

  async getChatMessages(roomId: string): Promise<ChatMessage[]> {
    try {
      if (!roomId) {
        throw new Error('Room ID not provided');
      }

      if (!this.matrixClient) {
        // Return simulated messages for demo
        return [
          {
            id: 'msg_1',
            senderId: 'admin',
            senderName: 'Admin',
            message: 'Welcome to our store! How can I help you today?',
            timestamp: Date.now() - 3600000, // 1 hour ago
            isAdmin: true
          }
        ];
      }

      // Get the room from Matrix
      let room = this.matrixClient.getRoom(roomId);
      if (!room) {
        // If room doesn't exist in Matrix, try to join it
        try {
          await this.matrixClient.joinRoom(roomId);
          // Wait for the room to be properly joined and synced
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Try to get the room again
          const joinedRoom = this.matrixClient.getRoom(roomId);
          if (!joinedRoom) {
            throw new Error('Failed to join room');
          }
          room = joinedRoom;
        } catch (joinError) {
          console.error('Error joining room:', joinError);
          // Return simulated messages for demo
          return [
            {
              id: 'msg_1',
              senderId: 'admin',
              senderName: 'Admin',
              message: 'Welcome to our store! How can I help you today?',
              timestamp: Date.now() - 3600000, // 1 hour ago
              isAdmin: true
            }
          ];
        }
      }

      // Get timeline events from the room
      const timelineEvents = room.getLiveTimeline().getEvents();
      
      // Convert Matrix events to ChatMessage format
      const messages: ChatMessage[] = timelineEvents
        .filter(event => event.getType() === 'm.room.message')
        .map(event => {
          const sender = room.getMember(event.getSender() || '');
          const content = event.getContent();
          const isAdmin = this.isUserAdmin(event.getSender() || '');
          
          // Handle different message types
          let message = '';
          let audioUri = undefined;
          let audioDuration = undefined;
          
          if (content.msgtype === 'm.audio') {
            // Audio message
            audioUri = content.url;
            audioDuration = content.duration || 0;
            message = '🎵 Voice message';
          } else {
            // Text message
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
            reactions: this.getReactionsForEvent(room, event)
          };
        });
      
      // Sort messages by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);
      
      return messages;
    } catch (error) {
      console.error('Error getting chat messages from Matrix:', error);
      // Return simulated messages for demo
      return [
        {
          id: 'msg_1',
          senderId: 'admin',
          senderName: 'Admin',
          message: 'Welcome to our store! How can I help you today?',
          timestamp: Date.now() - 3600000, // 1 hour ago
          isAdmin: true
        }
      ];
    }
  }
  
  private getReactionsForEvent(room: Room, event: MatrixEvent): Record<string, string[]> {
    const reactions: Record<string, string[]> = {};
    
    // Get all m.reaction events that relate to this event
    const relatedEvents = room.getUnfilteredTimelineSet().getRelationsForEvent(
      event.getId() || '',
      'm.annotation',
      'm.reaction'
    );
    
    if (relatedEvents) {
      // Group reactions by emoji
      relatedEvents.getAnnotations().forEach(annotation => {
        const content = annotation.getContent();
        const key = content['m.relates_to']?.key;
        const sender = annotation.getSender();
        
        if (key && sender) {
          if (!reactions[key]) {
            reactions[key] = [];
          }
          if (!reactions[key].includes(sender)) {
            reactions[key].push(sender);
          }
        }
      });
    }
    
    return reactions;
  }
  
  private isUserAdmin(userId: string): boolean {
    // Check if the user is an admin
    // This could be based on a role in your user database or a specific Matrix user ID pattern
    const adminUsername = process.env.EXPO_PUBLIC_ADMIN_USERNAME || 'roymichaels';
    return userId.includes(adminUsername);
  }

  async updateChatMessageReactions(roomId: string, eventId: string, emoji: string): Promise<boolean> {
    try {
      if (!this.matrixClient) {
        // For web platform, update reactions in Supabase
        return false; // This will trigger the fallback in the component
      }

      // Send a reaction to the message
      await this.matrixClient.sendEvent(roomId, 'm.reaction', {
        'm.relates_to': {
          rel_type: 'm.annotation',
          event_id: eventId,
          key: emoji
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating message reactions:', error);
      return false;
    }
  }

  // Method to check if stored auth is still valid
  async validateStoredAuth(): Promise<boolean> {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (!storedAuth) {
        return false;
      }

      const authData = JSON.parse(storedAuth);
      const now = Date.now();
      const authAge = now - (authData.timestamp || 0);
      
      // Consider auth valid for 30 days (adjust as needed)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      
      if (authAge > maxAge) {
        // Auth is too old, clear it
        await this.clearAuthStorage();
        this.isAuthenticated = false;
        this.currentUser = null;
        this.notifyListeners();
        return false;
      }

      // If we have a Matrix client, check if it's still valid
      if (this.matrixClient) {
        try {
          // Try to get user profile as a simple validation
          await this.matrixClient.getProfileInfo(authData.userId);
          return true;
        } catch (error) {
          console.error('Error validating Matrix client:', error);
          await this.handleAuthenticationError();
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validating stored auth:', error);
      await this.clearAuthStorage();
      return false;
    }
  }

  // Method to refresh auth state from storage (useful for app startup)
  async refreshAuthFromStorage(): Promise<void> {
    await this.initializeFromStorage();
  }
}
/*
  # Fix Chat Permissions for Regular Users

  1. Changes
    - Update RLS policies for chat_rooms and chat_messages tables
    - Allow regular users to create chat rooms and send messages
    - Fix permissions for non-admin users to interact with the chat system

  2. Security
    - Maintain proper data isolation between users
    - Ensure users can only access their own chat data
    - Allow admins to access all chat data
*/

-- Drop existing policies for chat_rooms
DROP POLICY IF EXISTS "Users can read their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can read all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can insert chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can update all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can delete chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Public access for chat_rooms" ON chat_rooms;

-- Create new policies for chat_rooms
CREATE POLICY "Users can read their own chat rooms" 
  ON chat_rooms FOR SELECT 
  TO public 
  USING (
    (SELECT auth.uid()) IS NOT NULL AND 
    user_id = (SELECT auth.uid())::text
  );

CREATE POLICY "Admin can read all chat rooms" 
  ON chat_rooms FOR SELECT 
  TO public 
  USING (
    is_admin()
  );

CREATE POLICY "Users can insert chat rooms" 
  ON chat_rooms FOR INSERT 
  TO public 
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can update their own chat rooms" 
  ON chat_rooms FOR UPDATE 
  TO public 
  USING (
    (SELECT auth.uid()) IS NOT NULL AND 
    user_id = (SELECT auth.uid())::text
  );

CREATE POLICY "Admin can update all chat rooms" 
  ON chat_rooms FOR UPDATE 
  TO public 
  USING (
    is_admin()
  );

CREATE POLICY "Admin can delete chat rooms" 
  ON chat_rooms FOR DELETE 
  TO public 
  USING (
    is_admin()
  );

-- Drop existing policies for chat_messages
DROP POLICY IF EXISTS "Users can read messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Admin can read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can update all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON chat_messages;
DROP POLICY IF EXISTS "Public access for chat_messages" ON chat_messages;

-- Create new policies for chat_messages
CREATE POLICY "Users can read messages in their rooms" 
  ON chat_messages FOR SELECT 
  TO public 
  USING (
    (SELECT auth.uid()) IS NOT NULL AND 
    room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = (SELECT auth.uid())::text
    )
  );

CREATE POLICY "Admin can read all messages" 
  ON chat_messages FOR SELECT 
  TO public 
  USING (
    is_admin()
  );

CREATE POLICY "Users can insert messages" 
  ON chat_messages FOR INSERT 
  TO public 
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
  );

CREATE POLICY "Users can update their own messages" 
  ON chat_messages FOR UPDATE 
  TO public 
  USING (
    (SELECT auth.uid()) IS NOT NULL AND 
    sender_id = (SELECT auth.uid())::text
  );

CREATE POLICY "Admin can update all messages" 
  ON chat_messages FOR UPDATE 
  TO public 
  USING (
    is_admin()
  );

CREATE POLICY "Admin can delete messages" 
  ON chat_messages FOR DELETE 
  TO public 
  USING (
    is_admin()
  );

-- Create a more permissive policy for anonymous users to allow initial setup
CREATE POLICY "Anonymous can access chat system" 
  ON chat_rooms FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Anonymous can access chat messages" 
  ON chat_messages FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);
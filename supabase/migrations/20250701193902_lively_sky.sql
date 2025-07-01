-- Drop existing policies for chat_rooms
DROP POLICY IF EXISTS "Users can read their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can read all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can insert chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users can update their own chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can update all chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Admin can delete chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Public access for chat_rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Anonymous can access chat system" ON chat_rooms;

-- Create new policies for chat_rooms
CREATE POLICY "Anyone can access chat rooms"
  ON chat_rooms FOR ALL
  USING (true)
  WITH CHECK (true);

-- Drop existing policies for chat_messages
DROP POLICY IF EXISTS "Users can read messages in their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Admin can read all messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can update all messages" ON chat_messages;
DROP POLICY IF EXISTS "Admin can delete messages" ON chat_messages;
DROP POLICY IF EXISTS "Public access for chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Anonymous can access chat messages" ON chat_messages;

-- Create new policies for chat_messages
CREATE POLICY "Anyone can access chat messages"
  ON chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);
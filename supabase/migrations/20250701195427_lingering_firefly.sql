-- Safely drop and recreate policies for chat_rooms
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DECLARE
    policy_names text[] := ARRAY[
      'Users can read their own chat rooms',
      'Admin can read all chat rooms',
      'Users can insert chat rooms',
      'Users can update their own chat rooms',
      'Admin can update all chat rooms',
      'Admin can delete chat rooms',
      'Public access for chat_rooms',
      'Anonymous can access chat system',
      'Anyone can access chat rooms',
      'Chat rooms permissive access'
    ];
    policy_name text;
  BEGIN
    FOREACH policy_name IN ARRAY policy_names
    LOOP
      IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = policy_name) THEN
        EXECUTE format('DROP POLICY "%s" ON chat_rooms', policy_name);
      END IF;
    END LOOP;
    
    -- Create new permissive policy with a unique name
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_rooms' AND policyname = 'Chat rooms permissive access') THEN
      CREATE POLICY "Chat rooms permissive access"
        ON chat_rooms FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
  END;
END $$;

-- Safely drop and recreate policies for chat_messages
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DECLARE
    policy_names text[] := ARRAY[
      'Users can read messages in their rooms',
      'Admin can read all messages',
      'Users can insert messages',
      'Users can update their own messages',
      'Admin can update all messages',
      'Admin can delete messages',
      'Public access for chat_messages',
      'Anonymous can access chat messages',
      'Anyone can access chat messages',
      'Chat messages permissive access'
    ];
    policy_name text;
  BEGIN
    FOREACH policy_name IN ARRAY policy_names
    LOOP
      IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = policy_name) THEN
        EXECUTE format('DROP POLICY "%s" ON chat_messages', policy_name);
      END IF;
    END LOOP;
    
    -- Create new permissive policy with a unique name
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Chat messages permissive access') THEN
      CREATE POLICY "Chat messages permissive access"
        ON chat_messages FOR ALL
        USING (true)
        WITH CHECK (true);
    END IF;
  END;
END $$;
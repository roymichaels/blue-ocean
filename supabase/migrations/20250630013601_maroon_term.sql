/*
  # Add Audio Support to Chat Messages

  1. Changes
    - Add `audio_uri` column to chat_messages table for storing voice message URIs
    - Add `audio_duration` column to chat_messages table for storing voice message duration
    - Add `reactions` column to chat_messages table for storing message reactions

  2. Security
    - Maintain existing RLS policies
*/

-- Add audio_uri column to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS audio_uri text;

-- Add audio_duration column to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS audio_duration integer;

-- Add reactions column to chat_messages table (JSON object)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '{}'::jsonb;
/*
  # Enable Realtime for Country Attack Stats

  1. Changes
    - Enable realtime publication for country_attack_stats table
    - This allows the frontend to receive live updates when attack numbers change
  
  2. Security
    - Realtime is only enabled for SELECT operations
    - Existing RLS policies still apply
*/

-- Enable realtime for the country_attack_stats table
ALTER PUBLICATION supabase_realtime ADD TABLE country_attack_stats;

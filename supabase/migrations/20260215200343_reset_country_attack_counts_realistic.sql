/*
  # Reset Country Attack Counts to Realistic Differentiated Values

  1. Purpose
    - Set each country's attack count to reflect their actual threat level
    - Create clear visual differentiation between high-risk and low-risk countries
    - Ensure numbers are proportional to risk scores

  2. Attack Count Distribution (Based on Risk Score)
    - China (Risk 95): 47,823 - Highest threat, state-sponsored APTs
    - Russia (Risk 92): 39,567 - Very high threat, ransomware operations
    - North Korea (Risk 88): 29,341 - High threat, cryptocurrency attacks
    - Iran (Risk 82): 23,456 - High threat, regional warfare
    - USA (Risk 65): 15,892 - Elevated threat, non-state actors
    - Brazil (Risk 58): 11,234 - Moderate threat, financial fraud
    - India (Risk 45): 7,621 - Lower threat, script kiddies
    - Vietnam (Risk 38): 4,187 - Lowest threat, opportunistic attacks

  3. Notes
    - Numbers are clearly differentiated to reflect threat levels
    - Higher risk countries have proportionally more attacks
    - Creates realistic threat visualization
*/

-- Reset attack counts to realistic, differentiated values
UPDATE country_attack_stats SET total_attacks = 47823 WHERE country_code = 'CN';
UPDATE country_attack_stats SET total_attacks = 39567 WHERE country_code = 'RU';
UPDATE country_attack_stats SET total_attacks = 29341 WHERE country_code = 'KP';
UPDATE country_attack_stats SET total_attacks = 23456 WHERE country_code = 'IR';
UPDATE country_attack_stats SET total_attacks = 15892 WHERE country_code = 'US';
UPDATE country_attack_stats SET total_attacks = 11234 WHERE country_code = 'BR';
UPDATE country_attack_stats SET total_attacks = 7621 WHERE country_code = 'IN';
UPDATE country_attack_stats SET total_attacks = 4187 WHERE country_code = 'VN';

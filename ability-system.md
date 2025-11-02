In this game, we have an ability system with 4 types of abilities (Action, Passive, Movement, Reaction).

Action - These are abilities that can be taken during combat - Either an attack, movement, stat buff, or stat debuff

Examples:
Charge - The unit may attack a unit that is in a straight line from it within 2 spaces. (This would be an attack that also moves the unit if they have a valid target within 2 spaces)

Heal - Heals a unit within the attack range using the untis Magic Power and Attunement stats to calculate the healing (Buff - increases health)

Quick - Allows the unit to move 2 spaces (Extra Movement)

Fireball - Perform an attack using your MPow with a range from 2 - 6. Cost 10 Mana. (Magic attack)

Teleport - Move anywhere within your line of site (Extra movment)

Slow - Reduces a targets speed by 3. (Debuff decreases Speed)

Strenght - Increases a targets PPower by 6. (Buff increases strength)

Passive - These are abilities with an effect that is always active (typically a stat increase or removal of an equipment restriction)

Example:

Meat Shield - Increases maxHealth by 50

Dual Wield - Allows the user to wield two one handed weapons even if their class does not allow it

Heavy Armor - Allows the user to wear heavy armor even if their class does not allow it

Reaction - These are abilities that occur after a unit is attacked in combat

Sturdy - After being attacked, heal 10 HP

Repost - After being attacked, perform a physical attack against the attacker if they are within attack range

Disappear - After being attacked, teleport to a random position that is far from enemies

Slippery - After being attacked, increase speed by 5.

Movement - These are abilities that trigger after a unit moves in combat OR if a unit chooses not to move during their turn in combat.

Meditate - If you don't move during your turn, you can 10% of your mana

Regenerate - After moving, gain 3 health for each space traveled

Journeyman - Gain 1XP for every space you move

Power Walker - After moving your Physical Power increases by 2.



We need to design a comprehensive document for how to define these abilities as well as how they will be implemented in the combat system.

Read all of @CombatHierarchy.md  to understand how it works. 

Abilities will need to configured via YAML file configurations more specifically the @react-app/src/data/ability-database.yaml  

We can create paramaterized functions and classes that they will use during run time but they should be configurable in the yaml files.

Does this make sense? If so, scan the GDD folder to understand how we create design document. Create a sub directory for the ability system. Then create an ability overview document.
Known Bugs

- Sometimes during sliding animation, the last frame shows the original order -- attempted but could not fix
- The map area is offset slightly which cuts off 2 px at the bottom. Should shift it up 2px. It looks like the top panel may be a few pixels too tall.
- Enemies use bad distance calculation for determining move, they should use BFS because walls will block them.
- Attack/Move options do not disable immediately (can be clicked during animation) and can be clicked and used

Missing Features
 - Enemy AI
 - When a Unit is KO'd they should always be shown at the end of the next turn list with KO listed, their action timer should be set to 0, and they should not be updated during ticks
 - We need a Victory screen
 - We need a Defeat screen
 - Unit reaction abilities should be implemented
 - Unit passive abilities should be implemented
 - Unit movement abilities should be implemented
 - Sprite animations
 - Sprite palette swapping
 - Audio System
    - Music System
    - SFX System

General improvments
 - Change text from "TIME UNTIL NEXT TURN" to "TIME UNTIL NEXT ACTION"
 - It would be great to have developer tools to easiliy filter logs when debugging.
 
 
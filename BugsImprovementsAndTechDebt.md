Known Bugs

- Sometimes during sliding animation, the last frame shows the original order -- attempted but could not fix
- The map area is offset slightly which cuts off 2 px at the bottom. Should shift it up 2px. It looks like the top panel may be a few pixels too tall.
- Attack/Move options do not disable immediately (can be clicked during animation) and can be clicked and used
- When animating a move, units will move through enemy tiles (positions are calculated properly, just not the path to get there)
- Turn order renders improperly sometimes when multiple units are at 0

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
 - Show animation of attack THEN show KO (or don't show numbers if unit is KO'd, or remove KO text from map)
 - Update weapons to have an "Attack Power" and "Attack Multiplier" rather than Physical Power / Physical Multiplier
 - Throughout we are missing a setter for wounds and the AI added a cast to any to set the private property. We should add a setter and refactor throughout
 - Flicker blood decals in combat rather than red square: decals-0,1,2,3,4,5 are all blood decals
 
 
 NEED TO DO
  - FirstPersonView needs to use the correct tiles for drawing the 3d view
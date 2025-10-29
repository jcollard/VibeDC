During combat units can perform an attack action.

This can be done during the Unit Turn Phase

We need state "canAct" by default this is true.

See: ActionsMenuContent

If the variable "canAct" is false, the "Attack", "Delay", and primary / secondary class menu options should be disabled. These are all actions.

During the player's turn, if they select the Attack action, it should open an "Attack" sub menu that will display information about their attack as well as give them an option to cancel.

It should display "Attack" at the top of the menu in dark red that works on a black background. Use or create a variable for this in colors.ts

Additionally, it should show the name of the weapon (or weapons if the acting unit is dual wielding) that are being used as well as the range.

Below that it will show "Target: Select a Target"

While on the attack menu: the game map, it will highlight the positions the weapon can attack with red squares. If line of sight to a position is blocked, the square will be grey. If a unit occupies one of the spaces, that space should be highlighted with yellow.

Hovering over a valid unit (yellow tile) will change the color to an oragne color. IF the mouse moves away, it will switch back to yellow. 

Clicking on the unit will select it. Only one unit may be selected at a time. The currently selected unit is highlighted with a green color. (Use or define all colors in colors.ts)

If a target is selected, the label should say "Target: {TARGET NAME}

If a target is selected, the panel will update to show the expected outcome.

% to hit: {getChanceToHit(attacker, defender, distance, 'physical')}
Damage: {calculateAttackDamage(attacker, weapon, defender, distance, 'physical')}

For now, stub these methods and return 1 (meaning 100%) and (1) meaning 1 damage.

If a target is selected, their stats should appear in the top info panel (UnitInfoContent). While taking an attack action, do not display the target units movement positions on the map (Showing the targets position is the default behaviour during the Unit Turn Phase but it shouldn't be displayed while taking an attack action)

There should be a "Cancel Attack" menu option which will exit the attack sub menu, unselect and unselect the target, this should exit the attack action. The "Cancel Attack" option should be directly below the attack results area. It should always be visible an enabled while the attack panel is visible.

If a valid target has been selected, there should be a "Perform Attack" option: when clicked will perform the attack. If no target is selected the perform attack button is not visible. This option should have ample spacing that a user would not click it on accident when they intend to click Cancle Attack. It should be below cancel and centered in the panel to give it distance / make it appear further away.

On clicking perform attack, the combat log should display the results of the attack using getChanceToHit to determine if the attack succeeds or misses.

On success: "{UNIT NAME} attacks {TARGET NAME} for {X} damage."
On miss: "{UNIT NAME} attacks {TARGET NAME} but misses."

Update the targets wounds (which should update its HP value)

If the target unit has 0 HP, display the message "{TARGET NAME} was knocked out."

After performing an attack, the variable canAct should be set to false. The return to the normal attack mode. Additionally, canResetMove should be set to false (a unit cannot reset their move after attacking. If they move after attacking, it will get set to tru and they will be able to reset, this is correct behaviour). Additionally, after attacking the unit should not be able to delay. 
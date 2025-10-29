Some Equipment will be Weapons

When a unit performs an Attack, if they have a weapon in one of their hands they will attack once with that weapon. If they have a weapon in each of their hands, they will attack twice: once with each weapon.

Weapons have a minimum attack range and a maximum attack range. These values will often both be 1, this means the unit can only attack in spaces adjacent to them orthogonally.

Ranged weapons may have a minimum that is greater than 1 indicating that they cannot attack adjacent units. For example, a minimum range of 2 and maximum range of 3 would indicate that the following attack pattern is available (X indicates spaces the unit can hit, @ represents the player location)

###X###
#XXXX##
#XX#XX#
XX#@#XX
#XX#XX#
##XXX##
###X###

Most classes cannot equip two weapons but some abilities allows them to do so. When this happens, the two weapons must have identical min and max ranges.

We need to update equipment to indicate if it is a weapon, as well as the attack range of the weapon.

When displaying information about an item EquipmentInfoContent.ts, we should display the type of item it is as well as indicate if it is a weapon. If it is a weapon, we should indicate the minimum and maximum attack range.
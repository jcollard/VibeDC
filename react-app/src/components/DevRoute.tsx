import React, { useState } from 'react';
import { DeveloperPanel } from './developer/DeveloperPanel';
import { SpriteRegistryPanel } from './developer/SpriteRegistryPanel';
import { FontRegistryPanel } from './developer/FontRegistryPanel';
import { EnemyRegistryPanel } from './developer/EnemyRegistryPanel';
import { PartyMemberRegistryPanel } from './developer/PartyMemberRegistryPanel';
import { AbilityRegistryPanel } from './developer/AbilityRegistryPanel';
import { EquipmentRegistryPanel } from './developer/EquipmentRegistryPanel';
import { ClassRegistryPanel } from './developer/ClassRegistryPanel';
import { TilesetRegistryPanel } from './developer/TilesetRegistryPanel';
import { EncounterRegistryPanel } from './developer/EncounterRegistryPanel';

export const DevRoute: React.FC = () => {
  const [developerPanelVisible, setDeveloperPanelVisible] = useState<boolean>(true);
  const [spriteRegistryVisible, setSpriteRegistryVisible] = useState<boolean>(false);
  const [fontRegistryVisible, setFontRegistryVisible] = useState<boolean>(false);
  const [enemyRegistryVisible, setEnemyRegistryVisible] = useState<boolean>(false);
  const [partyMemberRegistryVisible, setPartyMemberRegistryVisible] = useState<boolean>(false);
  const [abilityRegistryVisible, setAbilityRegistryVisible] = useState<boolean>(false);
  const [equipmentRegistryVisible, setEquipmentRegistryVisible] = useState<boolean>(false);
  const [classRegistryVisible, setClassRegistryVisible] = useState<boolean>(false);
  const [tilesetRegistryVisible, setTilesetRegistryVisible] = useState<boolean>(false);
  const [encounterRegistryVisible, setEncounterRegistryVisible] = useState<boolean>(false);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000'
    }}>
      {/* Developer panel */}
      {developerPanelVisible && (
        <DeveloperPanel
          onClose={() => setDeveloperPanelVisible(false)}
          onOpenMapEditor={() => {
            // Map editor not available in dev route
            console.log('Map editor not available in /dev route');
          }}
          onOpenSpriteRegistry={() => {
            setSpriteRegistryVisible(true);
            setDeveloperPanelVisible(false);
          }}
          onOpenFontRegistry={() => {
            setFontRegistryVisible(true);
            setDeveloperPanelVisible(false);
          }}
          onOpenEnemyRegistry={() => {
            setEnemyRegistryVisible(true);
            setDeveloperPanelVisible(false);
          }}
          onOpenPartyMemberRegistry={() => {
            setPartyMemberRegistryVisible(true);
            setDeveloperPanelVisible(false);
          }}
          onOpenAbilityRegistry={() => {
            setAbilityRegistryVisible(true);
            setDeveloperPanelVisible(false);
          }}
          onOpenEquipmentRegistry={() => {
            setEquipmentRegistryVisible(true);
            setDeveloperPanelVisible(false);
          }}
          onOpenClassRegistry={() => {
            setClassRegistryVisible(true);
            setDeveloperPanelVisible(false);
          }}
          onOpenTilesetRegistry={() => {
            setTilesetRegistryVisible(true);
            setDeveloperPanelVisible(false);
          }}
          onOpenEncounterRegistry={() => {
            setEncounterRegistryVisible(true);
            setDeveloperPanelVisible(false);
          }}
          onOpenDebugPanel={() => {
            // Debug panel not available in dev route
            console.log('Debug panel not available in /dev route');
          }}
        />
      )}

      {/* Sprite registry panel */}
      {spriteRegistryVisible && (
        <SpriteRegistryPanel
          onClose={() => {
            setSpriteRegistryVisible(false);
            setDeveloperPanelVisible(true);
          }}
        />
      )}

      {/* Font registry panel */}
      {fontRegistryVisible && (
        <FontRegistryPanel
          onClose={() => {
            setFontRegistryVisible(false);
            setDeveloperPanelVisible(true);
          }}
        />
      )}

      {/* Enemy registry panel */}
      {enemyRegistryVisible && (
        <EnemyRegistryPanel
          onClose={() => {
            setEnemyRegistryVisible(false);
            setDeveloperPanelVisible(true);
          }}
        />
      )}

      {/* Party member registry panel */}
      {partyMemberRegistryVisible && (
        <PartyMemberRegistryPanel
          onClose={() => {
            setPartyMemberRegistryVisible(false);
            setDeveloperPanelVisible(true);
          }}
        />
      )}

      {/* Ability registry panel */}
      {abilityRegistryVisible && (
        <AbilityRegistryPanel
          onClose={() => {
            setAbilityRegistryVisible(false);
            setDeveloperPanelVisible(true);
          }}
        />
      )}

      {/* Equipment registry panel */}
      {equipmentRegistryVisible && (
        <EquipmentRegistryPanel
          onClose={() => {
            setEquipmentRegistryVisible(false);
            setDeveloperPanelVisible(true);
          }}
        />
      )}

      {/* Class registry panel */}
      {classRegistryVisible && (
        <ClassRegistryPanel
          onClose={() => {
            setClassRegistryVisible(false);
            setDeveloperPanelVisible(true);
          }}
        />
      )}

      {/* Tileset registry panel */}
      {tilesetRegistryVisible && (
        <TilesetRegistryPanel
          onClose={() => {
            setTilesetRegistryVisible(false);
            setDeveloperPanelVisible(true);
          }}
        />
      )}

      {/* Encounter registry panel */}
      {encounterRegistryVisible && (
        <EncounterRegistryPanel
          onClose={() => {
            setEncounterRegistryVisible(false);
            setDeveloperPanelVisible(true);
          }}
        />
      )}
    </div>
  );
};

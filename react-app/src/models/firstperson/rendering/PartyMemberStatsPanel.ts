import type { CombatUnit } from '../../combat/CombatUnit';
import { FontAtlasRenderer } from '../../../utils/FontAtlasRenderer';

/**
 * Renders party member stats panel (HP/MP from CombatUnit)
 */
export class PartyMemberStatsPanel {
  /**
   * Render party member stats in the given region
   */
  static render(
    ctx: CanvasRenderingContext2D,
    partyMember: CombatUnit,
    regionX: number,
    regionY: number,
    regionWidth: number,
    _regionHeight: number,
    fontId: string,
    fontAtlasImage: HTMLImageElement | null
  ): void {
    if (!fontAtlasImage) return;

    ctx.save();

    const lineHeight = 8;
    let currentY = regionY + 4;

    // Character name
    FontAtlasRenderer.renderText(
      ctx,
      partyMember.name,
      regionX + 4,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += lineHeight + 2;

    // HP Bar
    const currentHp = partyMember.health;
    const maxHp = partyMember.maxHealth;

    FontAtlasRenderer.renderText(
      ctx,
      `HP: ${currentHp}/${maxHp}`,
      regionX + 4,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += lineHeight;

    // HP bar visualization
    const barWidth = regionWidth - 8;
    const barHeight = 4;
    const hpPercent = currentHp / maxHp;

    ctx.fillStyle = '#333333';
    ctx.fillRect(regionX + 4, currentY, barWidth, barHeight);

    ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(regionX + 4, currentY, Math.floor(barWidth * hpPercent), barHeight);

    currentY += barHeight + 4;

    // MP Bar
    const currentMp = partyMember.mana;
    const maxMp = partyMember.maxMana;

    FontAtlasRenderer.renderText(
      ctx,
      `MP: ${currentMp}/${maxMp}`,
      regionX + 4,
      currentY,
      fontId,
      fontAtlasImage,
      1,
      'left',
      '#ffffff'
    );
    currentY += lineHeight;

    // MP bar visualization
    const mpPercent = currentMp / maxMp;

    ctx.fillStyle = '#333333';
    ctx.fillRect(regionX + 4, currentY, barWidth, barHeight);

    ctx.fillStyle = '#0088ff';
    ctx.fillRect(regionX + 4, currentY, Math.floor(barWidth * mpPercent), barHeight);

    ctx.restore();
  }
}

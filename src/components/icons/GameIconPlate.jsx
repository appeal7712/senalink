import Icon from './Icon';
import { formationIconName, UI_GAME_ICON_DISPLAY_SCALE, UI_IMAGE_ICONS } from '../../data/uiIcons';
import { skillReserveIconName } from '../../lib/skillReserveIcon';

const LAYER_KEY = 'skillFormationLayer';

const PLATE_FORMATION_SCALE = 1.48;
const PLATE_SKILL_SCALE = 1.62;
const PLATE_GLYPH_INSET = 0.86;
const FORMATION_GLYPH_ASPECT = 90 / 66;

function plateDimensions(iconSize, plateScale, layer) {
  const plateH = Math.round(iconSize * plateScale);
  const plateW = Math.round(plateH * (layer.w / layer.h));
  return { plateW, plateH };
}

function glyphSizeInPlate({ iconSize, layer, plateScale, image, perceivedBoost = 1 }) {
  const extra = image?.displayScale ?? 1;
  const aspect = image ? image.w / image.h : 1;
  const { plateW, plateH } = plateDimensions(iconSize, plateScale, layer);
  const targetDisplayH = iconSize * UI_GAME_ICON_DISPLAY_SCALE * perceivedBoost;
  const byHeight = targetDisplayH / (UI_GAME_ICON_DISPLAY_SCALE * extra);
  const byWidth = (plateW * PLATE_GLYPH_INSET) / (aspect * UI_GAME_ICON_DISPLAY_SCALE * extra);
  return Math.max(12, Math.round(Math.min(byHeight, byWidth)));
}

function formationGlyphSize(iconSize, layer) {
  return glyphSizeInPlate({
    iconSize,
    layer,
    plateScale: PLATE_FORMATION_SCALE,
    image: { w: 90, h: 66 },
  });
}

function skillGlyphSize(iconSize, layer, iconName) {
  const image = UI_IMAGE_ICONS[iconName];
  return glyphSizeInPlate({
    iconSize,
    layer,
    plateScale: PLATE_SKILL_SCALE,
    image,
  });
}

/** 스킬 예약·진형 아이콘 뒤 게임 원형 레이어 */
export function GameIconPlate({ kind = 'skill', iconSize, plateScale, children, className = '' }) {
  const layer = UI_IMAGE_ICONS[LAYER_KEY];
  if (!layer || !iconSize) return children;

  const scale = plateScale ?? (kind === 'formation' ? PLATE_FORMATION_SCALE : PLATE_SKILL_SCALE);
  const { plateW, plateH } = plateDimensions(iconSize, scale, layer);

  return (
    <span
      className={`game-icon-plate game-icon-plate--${kind} ${className}`.trim()}
      style={{ width: plateW, height: plateH }}
      aria-hidden
    >
      <img src={layer.src} alt="" className="game-icon-plate__bg" width={plateW} height={plateH} />
      <span className="game-icon-plate__fg">{children}</span>
    </span>
  );
}

export function SkillReservePlateIcon({ reservedSkills, size, className }) {
  const layer = UI_IMAGE_ICONS[LAYER_KEY];
  const iconName = skillReserveIconName(reservedSkills);
  const glyphSize = layer ? skillGlyphSize(size, layer, iconName) : size;

  return (
    <GameIconPlate kind="skill" iconSize={size} className={className}>
      <Icon name={iconName} size={glyphSize} />
    </GameIconPlate>
  );
}

export function FormationPlateIcon({ formationId, size, className }) {
  const layer = UI_IMAGE_ICONS[LAYER_KEY];
  const iconName = formationIconName(formationId);
  let glyphSize = layer ? formationGlyphSize(size, layer) : size;
  if (iconName === 'formationProtect') {
    glyphSize = Math.max(12, Math.round(glyphSize * 0.9));
  }
  return (
    <GameIconPlate kind="formation" iconSize={size} className={className}>
      <Icon name={iconName} size={glyphSize} />
    </GameIconPlate>
  );
}

import {
  EXCLUSIVE_GEAR_TUNING_OPTIONS,
  EXCLUSIVE_GEAR_UI,
  getExclusiveGearOptionIconUrl,
  getExclusiveGearOptionValueLabel,
} from '../../data/exclusiveGearOptions';

export default function ExclusiveGearOptionBar({ optionKey = '', editing = false, onChange }) {
  const iconUrl = getExclusiveGearOptionIconUrl(optionKey);
  const valueLabel = getExclusiveGearOptionValueLabel(optionKey);

  return (
    <div className="exgear-option-bar">
      <img
        className="exgear-option-bar__bg"
        src={EXCLUSIVE_GEAR_UI.optionBar}
        alt=""
        aria-hidden
        draggable={false}
      />
      <div className="exgear-option-bar__inner">
        <img
          className="exgear-option-bar__legend"
          src={EXCLUSIVE_GEAR_UI.legendIcon}
          alt=""
          aria-hidden
          draggable={false}
        />
        <div className="exgear-option-bar__main">
          {editing ? (
            <select
              className="exgear-option-bar__select"
              value={optionKey}
              onChange={(e) => onChange?.(e.target.value)}
              aria-label="조율 옵션"
            >
              <option value="">— 옵션 선택 —</option>
              {EXCLUSIVE_GEAR_TUNING_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : optionKey ? (
            <>
              {iconUrl ? (
                <img
                  className="exgear-option-bar__stat"
                  src={iconUrl}
                  alt=""
                  aria-hidden
                  draggable={false}
                />
              ) : null}
              <span className="exgear-option-bar__name">{optionKey}</span>
            </>
          ) : (
            <span className="exgear-option-bar__empty">미설정</span>
          )}
        </div>
        {valueLabel ? <span className="exgear-option-bar__value">{valueLabel}</span> : null}
      </div>
    </div>
  );
}

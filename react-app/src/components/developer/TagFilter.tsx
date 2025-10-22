interface TagFilterProps {
  tags: string[];
  selectedTag: string;
  onTagSelect: (tag: string) => void;
  title?: string;
}

/**
 * Reusable tag filter component for registry panels.
 * Displays a list of clickable tags that can be used to filter items.
 */
export function TagFilter({ tags, selectedTag, onTagSelect, title = 'Tags' }: TagFilterProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>
        {title} <span style={{ fontSize: '9px', color: '#aaa', fontWeight: 'normal' }}>(click to filter)</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          maxHeight: '120px',
          overflowY: 'auto',
        }}
      >
        {tags.map(tag => {
          const isActive = selectedTag === tag;
          return (
            <span
              key={tag}
              onClick={() => onTagSelect(isActive ? '' : tag)}
              style={{
                padding: '3px 8px',
                background: isActive
                  ? 'rgba(255, 255, 0, 0.3)'
                  : 'rgba(76, 175, 80, 0.2)',
                border: isActive
                  ? '1px solid rgba(255, 255, 0, 0.6)'
                  : '1px solid rgba(76, 175, 80, 0.4)',
                borderRadius: '3px',
                fontSize: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(76, 175, 80, 0.4)';
                  e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.4)';
                }
              }}
              title={isActive ? 'Click to clear filter' : `Click to filter by "${tag}"`}
            >
              {tag}
            </span>
          );
        })}
      </div>
    </div>
  );
}

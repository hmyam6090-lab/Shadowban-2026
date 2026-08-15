import { useState } from 'react';

interface EmojiAvatarSelectorProps {
  selectedAvatar: string | null;
  onSelect: (emoji: string) => void;
}

const EMOJI_AVATARS = [
  '😀', '😎', '🤖', '🦊', '🐱', '🐶', '🦄', '🐼',
  '🎭', '🎨', '🎮', '🎸', '🎯', '🎲', '🎪', '🎢',
  '👻', '👽', '🤖', '🦸', '🦹', '🧙', '🧚', '🧛',
  '🌟', '⭐', '🌙', '☀️', '🌈', '🔥', '💎', '💎',
  '🎵', '🎶', '🎤', '🎧', '🎹', '🥁', '🎷', '🎺',
  '🚀', '🛸', '🌍', '🌎', '🌏', '🌊', '⚡', '💫',
];

export function EmojiAvatarSelector({ selectedAvatar, onSelect }: EmojiAvatarSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="emoji-avatar-selector">
      <div className="selected-avatar-display" onClick={() => setIsOpen(!isOpen)}>
        {selectedAvatar ? (
          <span className="avatar-emoji large">{selectedAvatar}</span>
        ) : (
          <span className="avatar-placeholder">Select Avatar</span>
        )}
        <span className="avatar-dropdown-arrow">▼</span>
      </div>
      
      {isOpen && (
        <div className="emoji-grid">
          {EMOJI_AVATARS.map((emoji) => (
            <button
              key={emoji}
              className={`emoji-option ${selectedAvatar === emoji ? 'selected' : ''}`}
              onClick={() => {
                onSelect(emoji);
                setIsOpen(false);
              }}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

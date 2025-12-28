// Reusable Tag Input Component
// Displays tags as chips with add/remove functionality

import { useState, useRef, type KeyboardEvent } from 'react';

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
}

export function TagInput({
  label,
  tags,
  onChange,
  placeholder = 'Add tag...',
  disabled = false,
  maxTags,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const newTag = inputValue.trim();

      // Don't add duplicates or exceed max
      if (!tags.includes(newTag) && (!maxTags || tags.length < maxTags)) {
        onChange([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag on backspace when input is empty
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    if (disabled) return;
    const newTags = [...tags];
    newTags.splice(index, 1);
    onChange(newTags);
  };

  const focusInput = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  const canAddMore = !maxTags || tags.length < maxTags;

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <div
        className={`
          flex flex-wrap gap-2 p-2 rounded-lg border bg-gray-800 min-h-[42px]
          ${disabled ? 'border-gray-700 opacity-50 cursor-not-allowed' : 'border-gray-600 cursor-text'}
          ${!disabled && 'focus-within:border-reachy-500 focus-within:ring-1 focus-within:ring-reachy-500'}
        `}
        onClick={focusInput}
      >
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className={`
              inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm
              bg-reachy-500/20 text-reachy-300 border border-reachy-500/30
              ${disabled ? '' : 'hover:bg-reachy-500/30'}
            `}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className="text-reachy-400 hover:text-reachy-200 focus:outline-none"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}
        {canAddMore && !disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[100px] bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
            disabled={disabled}
          />
        )}
      </div>
      {maxTags && (
        <p className="text-xs text-gray-500">
          {tags.length} / {maxTags} tags
        </p>
      )}
    </div>
  );
}

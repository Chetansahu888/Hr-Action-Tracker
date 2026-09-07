import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, ChevronDown, X, Search, CheckSquare, Square } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const DOER_COLORS = [
  { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', avatar: '#3b82f6' },
  { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', avatar: '#8b5cf6' },
  { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', avatar: '#10b981' },
  { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', avatar: '#f97316' },
  { bg: '#fdf4ff', border: '#f5d0fe', text: '#a21caf', avatar: '#d946ef' },
];

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = "Select assigned HR doer(s)...",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const [maxListHeight, setMaxListHeight] = useState(200);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smart calculation for dropdown placement (Top vs Bottom)
  const updatePlacement = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // If less than 230px space below and more space above, open upward
    if (spaceBelow < 230 && spaceAbove > spaceBelow) {
      setOpenUpward(true);
      setMaxListHeight(Math.max(140, Math.min(220, spaceAbove - 60)));
    } else {
      setOpenUpward(false);
      setMaxListHeight(Math.max(140, Math.min(220, spaceBelow - 60)));
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePlacement();
      window.addEventListener('resize', updatePlacement);
      window.addEventListener('scroll', updatePlacement, true);
    }
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen, updatePlacement]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter registered user options
  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase().trim())
  );

  const toggleSelect = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeChip = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    onChange(selected.filter(item => item !== option));
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const combined = Array.from(new Set([...selected, ...filteredOptions]));
    onChange(combined);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── Trigger Box ──────────────────────────── */}
      <div
        onClick={() => {
          updatePlacement();
          setIsOpen(!isOpen);
        }}
        style={{
          minHeight: 44,
          padding: '6px 12px',
          borderRadius: 12,
          border: isOpen ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          boxShadow: isOpen ? '0 0 0 3px rgba(37,99,235,0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          transition: 'all 0.15s ease',
        }}
      >
        {/* Selected chips / Placeholder */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', flex: 1 }}>
          {selected.length === 0 ? (
            <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 400, userSelect: 'none' }}>
              {placeholder}
            </span>
          ) : (
            selected.map((name, i) => {
              const color = DOER_COLORS[i % DOER_COLORS.length];
              return (
                <span
                  key={name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    borderRadius: 99,
                    backgroundColor: color.bg,
                    border: `1px solid ${color.border}`,
                    color: color.text,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: color.avatar,
                      color: '#ffffff',
                      fontSize: 9,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span>{name}</span>
                  <span
                    onClick={(e) => removeChip(e, name)}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      marginLeft: 2,
                    }}
                  >
                    <X size={10} />
                  </span>
                </span>
              );
            })
          )}
        </div>

        <ChevronDown
          size={16}
          color="#64748b"
          style={{
            transform: isOpen ? (openUpward ? 'rotate(0deg)' : 'rotate(180deg)') : (openUpward ? 'rotate(180deg)' : 'rotate(0deg)'),
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </div>

      {/* ── Dropdown Popover (Smart Upward/Downward Adjustable) ── */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            ...(openUpward
              ? { bottom: 'calc(100% + 6px)', top: 'auto' }
              : { top: 'calc(100% + 6px)', bottom: 'auto' }
            ),
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            borderRadius: 14,
            border: '1px solid #cbd5e1',
            boxShadow: openUpward
              ? '0 -12px 36px rgba(15,23,42,0.18), 0 -4px 12px rgba(0,0,0,0.08)'
              : '0 12px 36px rgba(15,23,42,0.18), 0 4px 12px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Search Box & Action Controls */}
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #e8ecf0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                autoFocus
                placeholder="Search registered HR users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  outline: 'none',
                  color: '#0f172a',
                  fontFamily: 'inherit',
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 2,
                    display: 'flex',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick Actions (Select All / Clear) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px dashed #e2e8f0' }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                {selected.length} selected of {options.length}
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#2563eb',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <CheckSquare size={12} /> Select All
                </button>
                {selected.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    <Square size={12} /> Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Options List (Adjustable scroll table) */}
          <div
            style={{
              maxHeight: maxListHeight,
              overflowY: 'auto',
              padding: '6px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                No registered user matching "{search}"
              </div>
            ) : (
              filteredOptions.map((opt, i) => {
                const isSelected = selected.includes(opt);
                const color = DOER_COLORS[i % DOER_COLORS.length];
                return (
                  <div
                    key={opt}
                    onClick={() => toggleSelect(opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      transition: 'background 0.1s',
                      marginBottom: 2,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          backgroundColor: color.avatar,
                          color: '#ffffff',
                          fontSize: 11,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {opt.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                        {opt}
                      </span>
                    </div>

                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 6,
                        border: isSelected ? 'none' : '1.5px solid #cbd5e1',
                        backgroundColor: isSelected ? '#2563eb' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MultiSelect;

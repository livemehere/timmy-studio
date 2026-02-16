export const Z_INDEX = {
  timeline: {
    clip: 5,
    playhead: 40,
    overlay: 50,
    trackHeader: 50,
    header: 60,
    selectionRect: 1000,
  },
  ui: {
    overlay: 2000,
    modal: 2100,
    popover: 2200,
    dropdown: 2200,
    hoverCard: 2200,
    combobox: 2200,
    contextMenu: 2300,
    tooltip: 2400,
    focus: 10,
  },
  demo: {
    background: 0,
    content: 10,
  },
} as const;

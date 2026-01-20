// Shared theme definitions for the extension UI.
const THEME_PRESETS = [
  {
    id: "dark_midnight",
    name: "Dark Midnight",
    vars: {
      "--bg": "#0b0f1a",
      "--panel": "#121a2a",
      "--panel-strong": "#1c2640",
      "--card": "#182335",
      "--border": "#8db4ff",
      "--text": "#e5edff",
      "--muted-text": "#b6c8ee",
      "--accent": "#5a8dff",
      "--accent2": "#9ec5ff",
      "--button-top": "#1c2640",
      "--button-bottom": "#101a2d",
      "--button-text": "#f6f8ff",
      "--shadow": "rgba(8, 13, 24, 0.45)",
      "--divider": "rgba(141, 180, 255, 0.26)"
    }
  },
  {
    id: "dark_emerald",
    name: "Dark Emerald",
    vars: {
      "--bg": "#0c1410",
      "--panel": "#111d17",
      "--panel-strong": "#1a2c22",
      "--card": "#15251d",
      "--border": "#63f2b8",
      "--text": "#d6ffea",
      "--muted-text": "#a6e7c8",
      "--accent": "#2fb57b",
      "--accent2": "#4de3aa",
      "--button-top": "#1a2c22",
      "--button-bottom": "#0f241a",
      "--button-text": "#e8fffb",
      "--shadow": "rgba(6, 15, 11, 0.5)",
      "--divider": "rgba(99, 242, 184, 0.25)"
    }
  },
  {
    id: "dark_amber",
    name: "Dark Amber",
    vars: {
      "--bg": "#0f0b07",
      "--panel": "#1a120c",
      "--panel-strong": "#26170d",
      "--card": "#20140b",
      "--border": "#f0b35c",
      "--text": "#ffe8c7",
      "--muted-text": "#f2c98f",
      "--accent": "#e9a23b",
      "--accent2": "#f5c068",
      "--button-top": "#26170d",
      "--button-bottom": "#1a0f0a",
      "--button-text": "#fff1db",
      "--shadow": "rgba(10, 7, 5, 0.5)",
      "--divider": "rgba(240, 179, 92, 0.25)"
    }
  },
  {
    id: "dark_ruby",
    name: "Dark Ruby",
    vars: {
      "--bg": "#11080a",
      "--panel": "#1b0e12",
      "--panel-strong": "#281019",
      "--card": "#1f0d14",
      "--border": "#ff8da4",
      "--text": "#ffe5ec",
      "--muted-text": "#ffc2d1",
      "--accent": "#e04a68",
      "--accent2": "#ff7a95",
      "--button-top": "#2d0f19",
      "--button-bottom": "#1b0a12",
      "--button-text": "#fff4f8",
      "--shadow": "rgba(15, 5, 8, 0.5)",
      "--divider": "rgba(255, 141, 164, 0.28)"
    }
  },
  {
    id: "emerald",
    name: "Emerald (GBA)",
    vars: {
      "--bg": "#d9f4d1",
      "--panel": "#eef9e6",
      "--panel-strong": "#c7f3d3",
      "--card": "#f6fff1",
      "--border": "#0f3d2b",
      "--text": "#0f291a",
      "--muted-text": "#1f422e",
      "--accent": "#2b8a5a",
      "--accent2": "#3bcf8f",
      "--button-top": "#e8fbe6",
      "--button-bottom": "#c5f2d1",
      "--button-text": "#0f291a",
      "--shadow": "rgba(9, 40, 25, 0.25)",
      "--divider": "rgba(15, 41, 26, 0.16)"
    }
  },
  {
    id: "ruby",
    name: "Ruby Ember",
    vars: {
      "--bg": "#fff0e6",
      "--panel": "#fff7f0",
      "--panel-strong": "#ffe1cc",
      "--card": "#fffaf5",
      "--border": "#6b2418",
      "--text": "#2e1a16",
      "--muted-text": "#4b2d26",
      "--accent": "#c53b2c",
      "--accent2": "#f26c54",
      "--button-top": "#ffe8dc",
      "--button-bottom": "#ffd0b8",
      "--button-text": "#2e1a16",
      "--shadow": "rgba(71, 27, 18, 0.22)",
      "--divider": "rgba(46, 26, 22, 0.2)"
    }
  },
  {
    id: "sapphire",
    name: "Sapphire Coast",
    vars: {
      "--bg": "#e9f2ff",
      "--panel": "#f5f8ff",
      "--panel-strong": "#dbe8ff",
      "--card": "#f9fbff",
      "--border": "#1f3f70",
      "--text": "#10213d",
      "--muted-text": "#1f3254",
      "--accent": "#3b74d7",
      "--accent2": "#6badff",
      "--button-top": "#eef3ff",
      "--button-bottom": "#d6e4ff",
      "--button-text": "#10213d",
      "--shadow": "rgba(16, 33, 61, 0.22)",
      "--divider": "rgba(16, 33, 61, 0.18)"
    }
  },
  {
    id: "leaf",
    name: "Leaf Meadow",
    vars: {
      "--bg": "#ecf7e8",
      "--panel": "#f7fbf3",
      "--panel-strong": "#d9eed1",
      "--card": "#fcfff9",
      "--border": "#28461c",
      "--text": "#182611",
      "--muted-text": "#2b3d23",
      "--accent": "#5a9b3d",
      "--accent2": "#8bcf63",
      "--button-top": "#eef7e6",
      "--button-bottom": "#d5edc6",
      "--button-text": "#182611",
      "--shadow": "rgba(24, 38, 17, 0.2)",
      "--divider": "rgba(24, 38, 17, 0.16)"
    }
  }
];

const DEFAULT_THEME_ID = THEME_PRESETS[0].id;

function applyTheme(themeId, doc = document) {
  const target = doc || document;
  const found = THEME_PRESETS.find((t) => t.id === themeId) || THEME_PRESETS[0];
  for (const [key, value] of Object.entries(found.vars)) {
    target.documentElement.style.setProperty(key, value);
  }
  target.documentElement.dataset.theme = found.id;
}

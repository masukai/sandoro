//! Color themes
//!
//! Defines color schemes for the TUI

// TODO: Pro themes will be used in Pro tier
#![allow(dead_code)]

use ratatui::style::Color;
use serde::{Deserialize, Serialize};

/// Theme definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Theme {
    pub name: String,
    pub background: ThemeColor,
    pub foreground: ThemeColor,
    pub primary: ThemeColor,
    pub secondary: ThemeColor,
    pub accent: ThemeColor,
    pub work: ThemeColor,
    pub short_break: ThemeColor,
    pub long_break: ThemeColor,
}

/// Color that can be serialized
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ThemeColor {
    Named(String),
    Rgb { r: u8, g: u8, b: u8 },
}

impl ThemeColor {
    pub fn to_color(&self) -> Color {
        match self {
            ThemeColor::Named(name) => match name.to_lowercase().as_str() {
                "black" => Color::Black,
                "red" => Color::Red,
                "green" => Color::Green,
                "yellow" => Color::Yellow,
                "blue" => Color::Blue,
                "magenta" => Color::Magenta,
                "cyan" => Color::Cyan,
                "white" => Color::White,
                "gray" | "grey" => Color::Gray,
                "darkgray" | "darkgrey" => Color::DarkGray,
                _ => Color::White,
            },
            ThemeColor::Rgb { r, g, b } => Color::Rgb(*r, *g, *b),
        }
    }

    /// Get RGB values as a tuple
    pub fn to_rgb(&self) -> (u8, u8, u8) {
        match self {
            ThemeColor::Rgb { r, g, b } => (*r, *g, *b),
            ThemeColor::Named(name) => match name.to_lowercase().as_str() {
                "black" => (0, 0, 0),
                "red" => (255, 0, 0),
                "green" => (0, 255, 0),
                "yellow" => (255, 255, 0),
                "blue" => (0, 0, 255),
                "magenta" => (255, 0, 255),
                "cyan" => (0, 255, 255),
                "white" => (255, 255, 255),
                "gray" | "grey" => (128, 128, 128),
                "darkgray" | "darkgrey" => (64, 64, 64),
                _ => (255, 255, 255),
            },
        }
    }

    /// Create ThemeColor from accent color name
    pub fn from_accent_name(name: &str) -> Self {
        match name.to_lowercase().as_str() {
            "red" => ThemeColor::Rgb {
                r: 239,
                g: 68,
                b: 68,
            },
            "orange" => ThemeColor::Rgb {
                r: 249,
                g: 115,
                b: 22,
            },
            "yellow" => ThemeColor::Rgb {
                r: 234,
                g: 179,
                b: 8,
            },
            "green" => ThemeColor::Rgb {
                r: 34,
                g: 197,
                b: 94,
            },
            "blue" => ThemeColor::Rgb {
                r: 59,
                g: 130,
                b: 246,
            },
            "indigo" => ThemeColor::Rgb {
                r: 99,
                g: 102,
                b: 241,
            },
            "purple" => ThemeColor::Rgb {
                r: 168,
                g: 85,
                b: 247,
            },
            "cyan" => ThemeColor::Rgb {
                r: 34,
                g: 211,
                b: 238,
            },
            "pink" => ThemeColor::Rgb {
                r: 236,
                g: 72,
                b: 153,
            },
            "rainbow" => {
                // Rainbow returns a default color (actual animation handled elsewhere)
                ThemeColor::Rgb {
                    r: 255,
                    g: 0,
                    b: 0,
                }
            }
            _ => ThemeColor::Rgb {
                r: 34,
                g: 211,
                b: 238,
            }, // Default to cyan
        }
    }
}

/// Available accent colors (matches Web version - 虹色7色 + cyan, pink, rainbow)
pub fn available_accent_colors() -> Vec<&'static str> {
    vec![
        "red", "orange", "yellow", "green", "blue", "indigo", "purple", "cyan", "pink", "rainbow",
    ]
}

/// Rainbow colors for animation (7 colors)
pub const RAINBOW_COLORS: [(u8, u8, u8); 7] = [
    (255, 0, 0),     // Red
    (255, 127, 0),   // Orange
    (255, 255, 0),   // Yellow
    (0, 255, 0),     // Green
    (0, 0, 255),     // Blue
    (75, 0, 130),    // Indigo
    (148, 0, 211),   // Violet
];

/// Get rainbow color at a given time offset (cycles through 7 colors)
pub fn get_rainbow_color(time_offset_ms: u64) -> (u8, u8, u8) {
    // Cycle through colors every 1 second (1000ms per color)
    let color_index = ((time_offset_ms / 1000) % 7) as usize;
    RAINBOW_COLORS[color_index]
}

/// Interpolate between two colors
fn lerp_color(c1: (u8, u8, u8), c2: (u8, u8, u8), t: f32) -> (u8, u8, u8) {
    let r = (c1.0 as f32 + (c2.0 as f32 - c1.0 as f32) * t) as u8;
    let g = (c1.1 as f32 + (c2.1 as f32 - c1.1 as f32) * t) as u8;
    let b = (c1.2 as f32 + (c2.2 as f32 - c1.2 as f32) * t) as u8;
    (r, g, b)
}

/// Get rainbow gradient color for a specific line
/// This creates a smooth vertical gradient effect like the web version
/// - line_index: current line (0-based)
/// - total_lines: total number of lines
/// - frame: animation frame (0-6) to scroll the gradient
pub fn get_rainbow_gradient_color(line_index: usize, total_lines: usize, frame: u8) -> (u8, u8, u8) {
    if total_lines == 0 {
        return RAINBOW_COLORS[0];
    }

    // Calculate position in the gradient (0.0 to 1.0)
    // Add frame offset to create scrolling animation
    let frame_offset = (frame as f32) / 7.0;
    let position = (line_index as f32 / total_lines as f32 + frame_offset) % 1.0;

    // Map position to color index with interpolation
    // Spread all 7 colors across the gradient
    let scaled = position * 7.0;
    let color_index = scaled.floor() as usize % 7;
    let next_index = (color_index + 1) % 7;
    let t = scaled.fract();

    lerp_color(RAINBOW_COLORS[color_index], RAINBOW_COLORS[next_index], t)
}

impl Theme {
    /// Default theme
    pub fn default_theme() -> Self {
        Self {
            name: "default".to_string(),
            background: ThemeColor::Named("black".to_string()),
            foreground: ThemeColor::Named("white".to_string()),
            primary: ThemeColor::Named("cyan".to_string()),
            secondary: ThemeColor::Named("gray".to_string()),
            accent: ThemeColor::Named("yellow".to_string()),
            work: ThemeColor::Named("green".to_string()),
            short_break: ThemeColor::Named("cyan".to_string()),
            long_break: ThemeColor::Named("blue".to_string()),
        }
    }

    /// Nord theme
    pub fn nord() -> Self {
        Self {
            name: "nord".to_string(),
            background: ThemeColor::Rgb {
                r: 46,
                g: 52,
                b: 64,
            },
            foreground: ThemeColor::Rgb {
                r: 236,
                g: 239,
                b: 244,
            },
            primary: ThemeColor::Rgb {
                r: 136,
                g: 192,
                b: 208,
            },
            secondary: ThemeColor::Rgb {
                r: 76,
                g: 86,
                b: 106,
            },
            accent: ThemeColor::Rgb {
                r: 235,
                g: 203,
                b: 139,
            },
            work: ThemeColor::Rgb {
                r: 163,
                g: 190,
                b: 140,
            },
            short_break: ThemeColor::Rgb {
                r: 136,
                g: 192,
                b: 208,
            },
            long_break: ThemeColor::Rgb {
                r: 129,
                g: 161,
                b: 193,
            },
        }
    }

    /// Dracula theme
    pub fn dracula() -> Self {
        Self {
            name: "dracula".to_string(),
            background: ThemeColor::Rgb {
                r: 40,
                g: 42,
                b: 54,
            },
            foreground: ThemeColor::Rgb {
                r: 248,
                g: 248,
                b: 242,
            },
            primary: ThemeColor::Rgb {
                r: 189,
                g: 147,
                b: 249,
            },
            secondary: ThemeColor::Rgb {
                r: 68,
                g: 71,
                b: 90,
            },
            accent: ThemeColor::Rgb {
                r: 255,
                g: 121,
                b: 198,
            },
            work: ThemeColor::Rgb {
                r: 80,
                g: 250,
                b: 123,
            },
            short_break: ThemeColor::Rgb {
                r: 139,
                g: 233,
                b: 253,
            },
            long_break: ThemeColor::Rgb {
                r: 189,
                g: 147,
                b: 249,
            },
        }
    }

    /// Get theme by name
    pub fn by_name(name: &str) -> Self {
        match name.to_lowercase().as_str() {
            "nord" => Self::nord(),
            "dracula" => Self::dracula(),
            _ => Self::default_theme(),
        }
    }

    /// Apply user-selected accent color to the theme
    pub fn with_accent(mut self, accent_name: &str) -> Self {
        self.accent = ThemeColor::from_accent_name(accent_name);
        self
    }

    /// List available themes (Free tier)
    pub fn free_themes() -> Vec<&'static str> {
        vec!["default", "nord", "dracula"]
    }

    /// List Pro themes
    pub fn pro_themes() -> Vec<&'static str> {
        vec![
            "solarized",
            "monokai",
            "gruvbox",
            "tokyo-night",
            "catppuccin",
            "rose-pine",
            "kanagawa",
        ]
    }
}

//! Color themes
//!
//! Defines color schemes for the TUI

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
            background: ThemeColor::Rgb { r: 46, g: 52, b: 64 },
            foreground: ThemeColor::Rgb { r: 236, g: 239, b: 244 },
            primary: ThemeColor::Rgb { r: 136, g: 192, b: 208 },
            secondary: ThemeColor::Rgb { r: 76, g: 86, b: 106 },
            accent: ThemeColor::Rgb { r: 235, g: 203, b: 139 },
            work: ThemeColor::Rgb { r: 163, g: 190, b: 140 },
            short_break: ThemeColor::Rgb { r: 136, g: 192, b: 208 },
            long_break: ThemeColor::Rgb { r: 129, g: 161, b: 193 },
        }
    }

    /// Dracula theme
    pub fn dracula() -> Self {
        Self {
            name: "dracula".to_string(),
            background: ThemeColor::Rgb { r: 40, g: 42, b: 54 },
            foreground: ThemeColor::Rgb { r: 248, g: 248, b: 242 },
            primary: ThemeColor::Rgb { r: 189, g: 147, b: 249 },
            secondary: ThemeColor::Rgb { r: 68, g: 71, b: 90 },
            accent: ThemeColor::Rgb { r: 255, g: 121, b: 198 },
            work: ThemeColor::Rgb { r: 80, g: 250, b: 123 },
            short_break: ThemeColor::Rgb { r: 139, g: 233, b: 253 },
            long_break: ThemeColor::Rgb { r: 189, g: 147, b: 249 },
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

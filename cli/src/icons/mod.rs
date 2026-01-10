//! ASCII art icons for the timer

pub mod coffee;
pub mod hourglass;
pub mod progress;
pub mod tomato;

/// Icon types available in the app
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum IconType {
    // Free icons
    None,
    Progress,
    Hourglass,
    Tomato,
    Coffee,
    // Pro icons
    Target,
    Fire,
    Star,
    Rocket,
    Wave,
    Game,
    Music,
}

impl IconType {
    /// Get all free icon types
    pub fn free_icons() -> Vec<IconType> {
        vec![
            IconType::None,
            IconType::Progress,
            IconType::Hourglass,
            IconType::Tomato,
            IconType::Coffee,
        ]
    }

    /// Check if this icon requires Pro subscription
    pub fn is_pro(&self) -> bool {
        matches!(
            self,
            IconType::Target
                | IconType::Fire
                | IconType::Star
                | IconType::Rocket
                | IconType::Wave
                | IconType::Game
                | IconType::Music
        )
    }

    /// All icons support animation
    pub fn has_animation(&self) -> bool {
        true
    }

    /// Get the emoji representation
    pub fn emoji(&self) -> &'static str {
        match self {
            IconType::None => "○",
            IconType::Progress => "▓",
            IconType::Hourglass => "⏳",
            IconType::Tomato => "🍅",
            IconType::Coffee => "☕",
            IconType::Target => "🎯",
            IconType::Fire => "🔥",
            IconType::Star => "⭐",
            IconType::Rocket => "🚀",
            IconType::Wave => "🌊",
            IconType::Game => "🎮",
            IconType::Music => "🎵",
        }
    }

    /// Get the display label
    pub fn label(&self) -> &'static str {
        match self {
            IconType::None => "None",
            IconType::Progress => "Bar",
            IconType::Hourglass => "Glass",
            IconType::Tomato => "Tomato",
            IconType::Coffee => "Coffee",
            IconType::Target => "Target",
            IconType::Fire => "Fire",
            IconType::Star => "Star",
            IconType::Rocket => "Rocket",
            IconType::Wave => "Wave",
            IconType::Game => "Game",
            IconType::Music => "Music",
        }
    }

    /// Parse from string
    pub fn from_str(s: &str) -> Option<IconType> {
        match s.to_lowercase().as_str() {
            "none" => Some(IconType::None),
            "progress" | "bar" => Some(IconType::Progress),
            "hourglass" | "glass" => Some(IconType::Hourglass),
            "tomato" => Some(IconType::Tomato),
            "coffee" => Some(IconType::Coffee),
            "target" => Some(IconType::Target),
            "fire" => Some(IconType::Fire),
            "star" => Some(IconType::Star),
            "rocket" => Some(IconType::Rocket),
            "wave" => Some(IconType::Wave),
            "game" => Some(IconType::Game),
            "music" => Some(IconType::Music),
            _ => None,
        }
    }
}

impl std::fmt::Display for IconType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IconType::None => write!(f, "none"),
            IconType::Progress => write!(f, "progress"),
            IconType::Hourglass => write!(f, "hourglass"),
            IconType::Tomato => write!(f, "tomato"),
            IconType::Coffee => write!(f, "coffee"),
            IconType::Target => write!(f, "target"),
            IconType::Fire => write!(f, "fire"),
            IconType::Star => write!(f, "star"),
            IconType::Rocket => write!(f, "rocket"),
            IconType::Wave => write!(f, "wave"),
            IconType::Game => write!(f, "game"),
            IconType::Music => write!(f, "music"),
        }
    }
}

/// Icon rendering state
pub struct IconState {
    pub icon_type: IconType,
    pub percent: f32,
    pub animation_frame: u8,
    pub is_animating: bool,
}

impl IconState {
    pub fn new(icon_type: IconType) -> Self {
        Self {
            icon_type,
            percent: 100.0,
            animation_frame: 0,
            is_animating: false,
        }
    }

    /// Render the icon as lines of text
    pub fn render(&self) -> Vec<String> {
        self.render_with_direction(false)
    }

    /// Render the icon with break direction support
    pub fn render_with_direction(&self, is_break: bool) -> Vec<String> {
        match self.icon_type {
            IconType::None => vec![],
            IconType::Progress => progress::render_progress_with_direction(
                self.percent,
                self.animation_frame,
                is_break,
            ),
            IconType::Hourglass => hourglass::render_hourglass_with_direction(
                self.percent,
                self.animation_frame,
                is_break,
            ),
            IconType::Tomato => {
                tomato::render_tomato_with_direction(self.percent, self.animation_frame, is_break)
            }
            IconType::Coffee => {
                coffee::render_coffee_with_direction(self.percent, self.animation_frame, is_break)
            }
            _ => vec!["[Icon not implemented]".to_string()],
        }
    }

    /// Advance animation to next frame
    pub fn advance_animation(&mut self) {
        if self.is_animating {
            let max_frames = match self.icon_type {
                IconType::Hourglass => 4,
                IconType::Coffee => 4,
                IconType::Tomato => 2,
                IconType::Progress => 2,
                IconType::Fire => 3,
                IconType::Star => 2,
                _ => 1,
            };
            self.animation_frame = (self.animation_frame + 1) % max_frames;
        }
    }
}

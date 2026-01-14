//! Coffee cup ASCII art animation
//!
//! Matches web version with larger handle and pouring animation during break
//! Work mode: steam rises with 4-phase animation

/// Render coffee at given percentage (100 = full, 0 = empty)
pub fn render_coffee(percent: f32, animation_frame: u8) -> Vec<String> {
    render_coffee_with_direction(percent, animation_frame, false)
}

/// Render coffee with flow direction control
pub fn render_coffee_with_direction(
    percent: f32,
    animation_frame: u8,
    is_break: bool,
) -> Vec<String> {
    const ROWS: usize = 6; // 元の高さを維持（滑らかな進捗表示）
    const MAX_LEVEL: usize = 18;
    const W: usize = 16; // 8から16に拡大（横長のマグカップ）

    // During break, progress shows how much has been refilled (0→100)
    let effective_progress = if is_break { 100.0 - percent } else { percent };

    // Remaining coffee level
    let remaining_level =
        ((100.0 - effective_progress) / 100.0 * MAX_LEVEL as f32).round() as usize;

    // Steam shows when cup is more than 40% full (60% of timer remaining)
    let show_steam = effective_progress < 60.0;

    // Pouring animation during break
    let is_pouring = is_break && percent > 0.0 && percent < 100.0;

    // Work mode animation (steam rising)
    let is_working = !is_break && percent > 0.0 && percent < 100.0;
    let work_frame = animation_frame % 4;

    // Generate coffee fill with gradient (wider cup, original height)
    let generate_fill = |level: usize| -> Vec<String> {
        let units_per_row = 3;
        let mut rows = Vec::new();

        for row in 0..ROWS {
            let row_from_bottom = ROWS - 1 - row;
            let row_start_unit = row_from_bottom * units_per_row;
            let fill_amount = level.saturating_sub(row_start_unit).min(units_per_row);

            let ch = if fill_amount == 0 {
                ' '
            } else if fill_amount >= units_per_row {
                // Gradient: denser at bottom
                if row_from_bottom <= 1 {
                    '▓'
                } else if row_from_bottom <= 3 {
                    '▒'
                } else {
                    '░'
                }
            } else {
                // Boundary row (surface) = wave
                '~'
            };

            rows.push(ch.to_string().repeat(W));
        }
        rows
    };

    let fill = generate_fill(remaining_level);

    // Steam pattern (work mode: 4-phase rising animation, wider)
    let (steam0, steam1, steam2) = if show_steam && is_working {
        // Rising steam animation
        match work_frame {
            0 => ("                ", "  ～      ～    ", "～            ～"),
            1 => ("  ～      ～    ", "～            ～", "      ～～      "),
            2 => ("～            ～", "      ～～      ", "       ~~       "),
            _ => ("      ～～      ", "       ~~       ", "                "),
        }
    } else if show_steam {
        ("                ", "  ～      ～    ", "～            ～")
    } else {
        ("                ", "                ", "                ")
    };

    // Pouring animation (during break, wider)
    let anim_frame = animation_frame % 2;
    let (pour1, pour2, pour3) = if is_pouring {
        if anim_frame == 0 {
            ("      │││      ", "      ╲│╱      ", "       ▼       ")
        } else {
            ("      │ │      ", "      ╲ ╱      ", "       ▽       ")
        }
    } else {
        ("               ", "               ", "               ")
    };

    // Coffee cup frame (wider mug shape, original height)
    if is_pouring {
        vec![
            format!("  {}  ", pour1),
            format!("  {}  ", pour2),
            format!("  {}  ", pour3),
            " ╭────────────────╮   ".to_string(),
            format!(" │{}├──╮", fill[0]),
            format!(" │{}│  │", fill[1]),
            format!(" │{}│  │", fill[2]),
            format!(" │{}├──╯", fill[3]),
            format!(" │{}│   ", fill[4]),
            format!(" │{}│   ", fill[5]),
            " ╰────────────────╯   ".to_string(),
            "     ══════════       ".to_string(),
            " ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ ".to_string(),
        ]
    } else {
        vec![
            format!("  {}  ", steam0),
            format!("  {}  ", steam1),
            format!("  {}  ", steam2),
            " ╭────────────────╮   ".to_string(),
            format!(" │{}├──╮", fill[0]),
            format!(" │{}│  │", fill[1]),
            format!(" │{}│  │", fill[2]),
            format!(" │{}├──╯", fill[3]),
            format!(" │{}│   ", fill[4]),
            format!(" │{}│   ", fill[5]),
            " ╰────────────────╯   ".to_string(),
            "     ══════════       ".to_string(),
            " ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ ".to_string(),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_coffee_full() {
        let lines = render_coffee(100.0, 0);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 13); // 元の行数に戻す
    }

    #[test]
    fn test_coffee_empty() {
        let lines = render_coffee(0.0, 0);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 13); // 元の行数に戻す
    }

    #[test]
    fn test_coffee_break_mode() {
        let lines = render_coffee_with_direction(50.0, 0, true);
        assert!(!lines.is_empty());
        // Check pouring animation is present
        assert!(lines[0].contains("│") || lines[1].contains("╲"));
    }

    #[test]
    fn test_coffee_work_mode() {
        let lines = render_coffee_with_direction(50.0, 0, false);
        assert!(!lines.is_empty());
        // Steam should be present in work mode (progress < 60%)
        assert!(lines[1].contains("～") || lines[2].contains("～"));
    }

    #[test]
    fn test_coffee_steam_animation() {
        let frame0 = render_coffee_with_direction(30.0, 0, false);
        let frame1 = render_coffee_with_direction(30.0, 1, false);
        let frame2 = render_coffee_with_direction(30.0, 2, false);
        // Different frames should show different steam positions
        assert!(frame0[0] != frame1[0] || frame0[1] != frame1[1] || frame0[2] != frame1[2]);
        assert!(frame1[0] != frame2[0] || frame1[1] != frame2[1] || frame1[2] != frame2[2]);
    }

    #[test]
    fn test_coffee_no_steam_when_low() {
        // At 80% progress, effective_progress = 80, which is >= 60
        // So steam should NOT show
        let lines = render_coffee_with_direction(80.0, 0, false);
        let steam_area = format!("{}{}{}", lines[0], lines[1], lines[2]);
        // Should have very few or no steam characters
        let steam_count = steam_area.matches("～").count() + steam_area.matches("~").count();
        assert!(steam_count < 4);
    }

    #[test]
    fn test_coffee_has_handle() {
        let lines = render_coffee(50.0, 0);
        // Cup should have handle markers
        let all_lines = lines.join("");
        assert!(all_lines.contains("├"));
        assert!(all_lines.contains("╯"));
    }

    #[test]
    fn test_coffee_has_saucer() {
        let lines = render_coffee(50.0, 0);
        // Bottom should have saucer (at index 11)
        assert!(lines[11].contains("══"));
    }

    #[test]
    fn test_coffee_fill_gradient() {
        // At low progress (high coffee), should show fill gradient
        let lines = render_coffee(20.0, 0);
        let fill_area = lines[4..10].join(""); // 元の範囲に戻す
                                               // Should contain gradient characters
        assert!(fill_area.contains("▓") || fill_area.contains("▒") || fill_area.contains("░"));
    }

    #[test]
    fn test_coffee_pouring_animation_frames() {
        let frame0 = render_coffee_with_direction(50.0, 0, true);
        let frame1 = render_coffee_with_direction(50.0, 1, true);
        // Pouring animation should alternate
        assert_ne!(frame0[0], frame1[0]);
    }
}

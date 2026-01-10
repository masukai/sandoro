//! Tomato ASCII art animation
//!
//! Two cherry tomatoes hanging from a vine
//! Matches web version with sun regeneration animation during break
//! Work mode: tomatoes sway left/right

/// Render tomato at given percentage (100 = full, 0 = empty)
pub fn render_tomato(percent: f32) -> Vec<String> {
    render_tomato_with_direction(percent, 0, false)
}

/// Render tomato with flow direction control
pub fn render_tomato_with_direction(
    percent: f32,
    animation_frame: u8,
    is_break: bool,
) -> Vec<String> {
    // During break, progress shows recovery (0→100 means empty→full)
    let effective_progress = if is_break { 100.0 - percent } else { percent };

    // Total level (0-10)
    let total_level = ((100.0 - effective_progress) / 100.0 * 10.0).round() as usize;

    // Right tomato: level 1-5, Left tomato: level 6-10
    let right_level = total_level.min(5);
    let left_level = total_level.saturating_sub(5).min(5);

    // Break mode regeneration
    let is_growing = is_break && percent > 0.0 && percent < 100.0;

    // Work mode animation
    let is_working = !is_break && percent > 0.0 && percent < 100.0;
    let work_frame = animation_frame % 2;

    // Generate tomato fill (level 0-5)
    // row 1-6 maps to fill thresholds 5-0 (top to bottom)
    let generate_fill = |level: usize, row: usize, width: usize| -> String {
        let fill_row = 6 - row; // row1→5, row2→4, row3→3, row4→2, row5→1, row6→0
        if level > fill_row {
            "▓".repeat(width)
        } else {
            " ".repeat(width)
        }
    };

    // Left tomato fills
    let l1 = generate_fill(left_level, 1, 4);
    let l2 = generate_fill(left_level, 2, 6);
    let l3 = generate_fill(left_level, 3, 8);
    let l4 = generate_fill(left_level, 4, 8);
    let l5 = generate_fill(left_level, 5, 6);
    let l6 = generate_fill(left_level, 6, 4);

    // Right tomato fills
    let r1 = generate_fill(right_level, 1, 4);
    let r2 = generate_fill(right_level, 2, 6);
    let r3 = generate_fill(right_level, 3, 8);
    let r4 = generate_fill(right_level, 4, 8);
    let r5 = generate_fill(right_level, 5, 6);
    let r6 = generate_fill(right_level, 6, 4);

    // Base tomato shape (fixed)
    let base_tomatoes = vec![
        "      |              |    ".to_string(),
        "    \\ | /          \\ | /  ".to_string(),
        "   \\ \\|/ /        \\ \\|/ / ".to_string(),
        format!("  /::{}::\\     /::{}::\\  ", l1, r1),
        format!(" /::{}::\\   /::{}::\\ ", l2, r2),
        format!("|::{}::| |::{}::|", l3, r3),
        format!("|::{}::| |::{}::|", l4, r4),
        format!(" \\::{}::/   \\::{}::/ ", l5, r5),
        format!("  \\::{}::/     \\::{}::/  ", l6, r6),
        "    \\::::/         \\::::/   ".to_string(),
    ];

    // Stem + tomatoes (work mode: slide left/right together)
    let stem_and_tomatoes: Vec<String> = if is_working {
        let mut result = vec!["~~~~═════════════════════~~~~".to_string()];
        if work_frame == 0 {
            // Slide left (shift 1 char left)
            for line in &base_tomatoes {
                let chars: Vec<char> = line.chars().collect();
                let shifted: String = chars.iter().skip(1).collect::<String>() + " ";
                result.push(shifted);
            }
        } else {
            // Slide right (shift 1 char right)
            for line in &base_tomatoes {
                let chars: Vec<char> = line.chars().collect();
                let len = chars.len();
                let shifted: String =
                    " ".to_string() + &chars[..len.saturating_sub(1)].iter().collect::<String>();
                result.push(shifted);
            }
        }
        result
    } else {
        // Static position
        let mut result = vec!["~~~~═════════════════════~~~~".to_string()];
        result.extend(base_tomatoes);
        result
    };

    // Sun animation during break regeneration
    if is_growing {
        let sun_frame = animation_frame % 2;
        let sun = if sun_frame == 0 {
            vec![
                "         \\   |   /         ".to_string(),
                "          \\  |  /          ".to_string(),
                "       ----[  ]----        ".to_string(),
                "          /  |  \\          ".to_string(),
                "         /   |   \\         ".to_string(),
                "                           ".to_string(),
            ]
        } else {
            vec![
                "             |              ".to_string(),
                "             |              ".to_string(),
                "       ----[  ]----        ".to_string(),
                "             |              ".to_string(),
                "             |              ".to_string(),
                "                           ".to_string(),
            ]
        };

        let mut result = sun;
        result.extend(stem_and_tomatoes);
        result
    } else {
        stem_and_tomatoes
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tomato_full() {
        let lines = render_tomato(100.0);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 11);
    }

    #[test]
    fn test_tomato_empty() {
        let lines = render_tomato(0.0);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 11);
    }

    #[test]
    fn test_tomato_break_mode() {
        let lines = render_tomato_with_direction(50.0, 0, true);
        assert!(!lines.is_empty());
        // Check sun animation is present (6 sun lines + 11 tomato lines)
        assert_eq!(lines.len(), 17);
    }

    #[test]
    fn test_tomato_work_mode() {
        let lines = render_tomato_with_direction(50.0, 0, false);
        assert!(!lines.is_empty());
        // No sun animation in work mode
        assert_eq!(lines.len(), 11);
    }

    #[test]
    fn test_tomato_sway_animation() {
        let frame0 = render_tomato_with_direction(50.0, 0, false);
        let frame1 = render_tomato_with_direction(50.0, 1, false);
        // Different frames should have different content
        assert_ne!(frame0[1], frame1[1]);
    }

    #[test]
    fn test_tomato_has_vine() {
        let lines = render_tomato(50.0);
        // Should have vine characters
        assert!(lines[0].contains("~~~~"));
        assert!(lines[0].contains("═"));
    }

    #[test]
    fn test_tomato_two_fruits() {
        let lines = render_tomato(50.0);
        // Should have heata indicators for two tomatoes
        let all_lines = lines.join("");
        let pipe_count = all_lines.matches("|").count();
        assert!(pipe_count >= 2);
    }

    #[test]
    fn test_tomato_sun_animation_frames() {
        let frame0 = render_tomato_with_direction(50.0, 0, true);
        let frame1 = render_tomato_with_direction(50.0, 1, true);
        // Sun animation should change between frames
        // First 6 lines are sun
        assert!(frame0[0] != frame1[0] || frame0[1] != frame1[1]);
    }

    #[test]
    fn test_tomato_no_sun_at_start() {
        // At 0% break progress, no growing animation
        let lines = render_tomato_with_direction(0.0, 0, true);
        // Should not have sun (normal 11 lines)
        assert_eq!(lines.len(), 11);
    }

    #[test]
    fn test_tomato_no_sun_at_end() {
        // At 100% break progress, no growing animation
        let lines = render_tomato_with_direction(100.0, 0, true);
        // Should not have sun (normal 11 lines)
        assert_eq!(lines.len(), 11);
    }

    #[test]
    fn test_tomato_fill_gradient() {
        // At low progress, tomatoes should be more filled
        let lines = render_tomato(20.0);
        let all_lines = lines.join("");
        // Should have fill gradient characters
        assert!(all_lines.contains("▓"));
    }
}

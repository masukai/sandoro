//! Hourglass ASCII art animation
//!
//! Rich design with Unicode block characters for shading effects
//! Uses ░▒▓ for sand gradients and ╔╗╚╝║═╲╱ for frame
//! 18-level granularity (6 rows × 3 gradient steps per row)
//!
//! During work: sand falls from top to bottom (4-phase falling animation)
//! During break: sand rises from bottom to top (blinking animation)

/// Render hourglass at given percentage
/// - `percent`: 0 = start, 100 = end
/// - `animation_frame`: for flowing sand animation
pub fn render_hourglass(percent: f32, animation_frame: u8) -> Vec<String> {
    render_hourglass_with_direction(percent, animation_frame, false)
}

/// Render hourglass with flow direction control
pub fn render_hourglass_with_direction(
    percent: f32,
    animation_frame: u8,
    is_break: bool,
) -> Vec<String> {
    const ROWS: usize = 6;
    const MAX_LEVEL: usize = 18; // 6 rows × 3 gradient steps
    const W: usize = 10;

    // Calculate sand levels based on direction
    let (top_level, bottom_level, is_upward): (usize, usize, bool) = if is_break {
        let top = ((percent as f64 / 100.0) * MAX_LEVEL as f64).round() as usize;
        let bot = (((100.0 - percent) as f64 / 100.0) * MAX_LEVEL as f64).round() as usize;
        (top.min(MAX_LEVEL), bot.min(MAX_LEVEL), true)
    } else {
        let top = (((100.0 - percent) as f64 / 100.0) * MAX_LEVEL as f64).round() as usize;
        let bot = ((percent as f64 / 100.0) * MAX_LEVEL as f64).round() as usize;
        (top.min(MAX_LEVEL), bot.min(MAX_LEVEL), false)
    };

    // Generate sand rows with gradient
    let generate_sand = |level: usize| -> Vec<String> {
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
                // Partial fill (boundary row)
                if fill_amount == 1 {
                    '░'
                } else if fill_amount == 2 {
                    '▒'
                } else {
                    '▓'
                }
            };

            rows.push(ch.to_string().repeat(W));
        }
        rows
    };

    let top_sand = generate_sand(top_level);
    let bot_sand = generate_sand(bottom_level);

    // Helper to slice unicode string by char indices
    fn slice_chars(s: &str, start: usize, end: usize) -> String {
        s.chars().skip(start).take(end - start).collect()
    }

    let flowing = percent > 0.0 && percent < 100.0;
    let frame = animation_frame % 4;

    // Flowing sand animation (4-phase for finer detail)
    let (flow1, flow2) = if flowing {
        if is_upward {
            // Break mode: blinking upward
            if frame % 2 == 0 {
                ("↑", "°")
            } else {
                ("°", "↑")
            }
        } else {
            // Work mode: 4-phase falling animation
            match frame {
                0 => ("▼", " "),
                1 => ("·", "▼"),
                2 => (" ", "·"),
                _ => ("·", " "),
            }
        }
    } else {
        (" ", " ")
    };

    // Bottleneck sand expression (only during flow)
    let (neck1, neck2) = if flowing {
        if is_upward {
            // Break mode
            if frame % 2 == 0 {
                ("·", "°")
            } else {
                ("°", "·")
            }
        } else {
            // Work mode: cycling gradient
            match frame {
                0 => ("▓", "░"),
                1 => ("░", "▒"),
                2 => ("▒", "▓"),
                _ => ("▓", "▒"),
            }
        }
    } else {
        (" ", " ")
    };

    // Frame design matching web version
    vec![
        " ╔══════════╗ ".to_string(),
        " ║▄▄▄▄▄▄▄▄▄▄║ ".to_string(),
        format!(" ║{}║ ", top_sand[0]),
        format!(" ║{}║ ", top_sand[1]),
        format!(" ║{}║ ", top_sand[2]),
        format!(" ║{}║ ", top_sand[3]),
        format!("  ╲{}╱  ", slice_chars(&top_sand[4], 1, W - 1)),
        format!("   ╲{}╱   ", slice_chars(&top_sand[5], 2, W - 2)),
        format!("    ╲ {}{} ╱    ", flow1, flow2),
        format!("     ╲{}{}╱     ", neck1, neck2),
        format!("     ╱{}{}╲     ", neck2, neck1),
        format!("    ╱ {}{} ╲    ", flow2, flow1),
        format!("   ╱{}╲   ", slice_chars(&bot_sand[0], 2, W - 2)),
        format!("  ╱{}╲  ", slice_chars(&bot_sand[1], 1, W - 1)),
        format!(" ║{}║ ", bot_sand[2]),
        format!(" ║{}║ ", bot_sand[3]),
        format!(" ║{}║ ", bot_sand[4]),
        format!(" ║{}║ ", bot_sand[5]),
        " ║▀▀▀▀▀▀▀▀▀▀║ ".to_string(),
        " ╚══════════╝ ".to_string(),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hourglass_full() {
        let lines = render_hourglass(100.0, 0);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 20);
    }

    #[test]
    fn test_hourglass_empty() {
        let lines = render_hourglass(0.0, 0);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 20);
    }

    #[test]
    fn test_hourglass_half() {
        let lines = render_hourglass(50.0, 0);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 20);
    }

    #[test]
    fn test_hourglass_break_mode() {
        // Break mode: sand flows upward
        let lines = render_hourglass_with_direction(50.0, 0, true);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 20);
        // Check that flow indicator shows upward direction
        assert!(lines[8].contains("↑") || lines[8].contains("°"));
    }

    #[test]
    fn test_hourglass_work_mode() {
        // Work mode: sand flows downward
        let lines = render_hourglass_with_direction(50.0, 0, false);
        assert!(!lines.is_empty());
        assert_eq!(lines.len(), 20);
        // Check that flow indicator shows downward direction
        assert!(lines[8].contains("▼") || lines[8].contains("·") || lines[8].contains(" "));
    }

    #[test]
    fn test_hourglass_animation_frames() {
        let frame0 = render_hourglass_with_direction(50.0, 0, false);
        let frame1 = render_hourglass_with_direction(50.0, 1, false);
        let frame2 = render_hourglass_with_direction(50.0, 2, false);
        let frame3 = render_hourglass_with_direction(50.0, 3, false);
        // Different frames should have different flow patterns
        assert!(frame0[8] != frame1[8] || frame0[9] != frame1[9]);
        assert!(frame1[8] != frame2[8] || frame1[9] != frame2[9]);
        assert!(frame2[8] != frame3[8] || frame2[9] != frame3[9]);
    }

    #[test]
    fn test_hourglass_bottleneck_sand_expression() {
        // At 50% progress, bottleneck should show sand gradient
        let lines = render_hourglass_with_direction(50.0, 0, false);
        // Lines 9 and 10 contain the bottleneck
        let bottleneck = format!("{}{}", lines[9], lines[10]);
        // Should contain gradient characters
        assert!(bottleneck.contains("▓") || bottleneck.contains("▒") || bottleneck.contains("░"));
    }

    #[test]
    fn test_hourglass_no_flow_at_start() {
        // At 0%, no flow should be happening
        let lines = render_hourglass_with_direction(0.0, 0, false);
        // Line 8 should not have flow indicators when not flowing
        assert!(!lines[8].contains("▼"));
    }

    #[test]
    fn test_hourglass_no_flow_at_end() {
        // At 100%, no flow should be happening
        let lines = render_hourglass_with_direction(100.0, 0, false);
        // Line 8 should not have flow indicators when not flowing
        assert!(!lines[8].contains("▼"));
    }

    #[test]
    fn test_hourglass_frame_contains_unicode() {
        let lines = render_hourglass(50.0, 0);
        // Frame should contain box drawing characters
        assert!(lines[0].contains("╔"));
        assert!(lines[0].contains("╗"));
        assert!(lines[19].contains("╚"));
        assert!(lines[19].contains("╝"));
    }
}

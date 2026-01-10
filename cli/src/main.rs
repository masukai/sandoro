//! sandoro - Terminal-first Pomodoro timer with ASCII art animations
//!
//! A pomodoro timer featuring hourglass animations and customizable themes.

use anyhow::Result;
use clap::{Parser, Subcommand};

mod app;
mod config;
mod db;
mod icons;
mod theme;
mod timer;
mod ui;

#[derive(Parser)]
#[command(name = "sandoro")]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Start a pomodoro session
    Start {
        /// Work duration in minutes (default: 25)
        #[arg(short, long, default_value = "25")]
        work: u32,

        /// Short break duration in minutes (default: 5)
        #[arg(short, long, default_value = "5")]
        short_break: u32,

        /// Long break duration in minutes (default: 15)
        #[arg(short, long, default_value = "15")]
        long_break: u32,
    },
    /// Show statistics
    Stats {
        /// Show daily stats
        #[arg(short, long)]
        day: bool,

        /// Show weekly stats
        #[arg(short, long)]
        week: bool,

        /// Show monthly stats
        #[arg(short, long)]
        month: bool,
    },
    /// Configure settings
    Config {
        /// Set icon type (hourglass, tomato, coffee)
        #[arg(long)]
        icon: Option<String>,

        /// Set theme (default, nord, dracula)
        #[arg(long)]
        theme: Option<String>,
    },
    /// Activate Pro license
    License {
        /// License key (SAND-XXXX-XXXX-XXXX-XXXX)
        key: String,
    },
    /// Sync data with cloud (Pro only)
    Sync,
    /// Login to sandoro account
    Login,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Start {
            work: _,
            short_break: _,
            long_break: _,
        }) => {
            // Config is loaded from file; CLI args are deprecated
            app::run()?;
        }
        Some(Commands::Stats { day, week, month }) => {
            if day {
                println!("Showing daily stats...");
            } else if week {
                println!("Showing weekly stats...");
            } else if month {
                println!("Showing monthly stats...");
            } else {
                println!("Showing daily stats (default)...");
            }
            // TODO: Implement stats display
        }
        Some(Commands::Config { icon, theme }) => {
            if let Some(icon) = icon {
                println!("Setting icon to: {}", icon);
            }
            if let Some(theme) = theme {
                println!("Setting theme to: {}", theme);
            }
            // TODO: Implement config update
        }
        Some(Commands::License { key }) => {
            println!("Activating license: {}", key);
            // TODO: Implement license activation
        }
        Some(Commands::Sync) => {
            println!("Syncing with cloud...");
            // TODO: Implement cloud sync
        }
        Some(Commands::Login) => {
            println!("Opening browser for authentication...");
            // TODO: Implement OAuth login
        }
        None => {
            // Default: start timer with settings from config file
            app::run()?;
        }
    }

    Ok(())
}

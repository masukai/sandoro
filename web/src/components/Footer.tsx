interface FooterProps {
  onPrivacyClick: () => void;
}

export function Footer({ onPrivacyClick }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-2 px-4 text-center text-xs text-sandoro-secondary border-t border-sandoro-secondary/20">
      <div className="flex flex-col items-center gap-1">
        {/* First row: Copyright and links */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <span>&copy; {currentYear} K. Masuda</span>
          <span>|</span>
          <button
            onClick={onPrivacyClick}
            className="hover:text-sandoro-primary hover:underline transition-colors"
          >
            Privacy
          </button>
          <span>|</span>
          <a
            href="https://github.com/masukai/sandoro/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sandoro-primary hover:underline transition-colors"
          >
            Contact
          </a>
          <span>|</span>
          <a
            href="https://github.com/masukai/sandoro"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sandoro-primary hover:underline transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

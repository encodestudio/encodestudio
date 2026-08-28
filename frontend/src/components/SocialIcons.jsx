const common = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function LinkedInIcon(props) {
  return (
    <svg {...common} {...props}>
      <path d="M6.94 8.5H3.56V20.5H6.94V8.5Z" />
      <path d="M5.25 6.5C6.35 6.5 7.25 5.6 7.25 4.5C7.25 3.4 6.35 2.5 5.25 2.5C4.15 2.5 3.25 3.4 3.25 4.5C3.25 5.6 4.15 6.5 5.25 6.5Z" />
      <path d="M10.5 8.5H13.75V10.05C14.35 9.05 15.7 8.2 17.3 8.2C20.2 8.2 21 9.9 21 12.7V20.5H17.6V13.4C17.6 11.9 17.1 11 15.8 11C14.6 11 13.9 11.85 13.9 13.4V20.5H10.5V8.5Z" />
    </svg>
  );
}

export function InstagramIcon(props) {
  return (
    <svg {...common} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function XIcon(props) {
  return (
    <svg {...common} {...props}>
      <path d="M4 4L20 20" />
      <path d="M20 4L4 20" />
    </svg>
  );
}

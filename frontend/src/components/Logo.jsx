import logoFull from "../assets/encode-logo.png";
import logoMark from "../assets/encode-mark.png";

export default function Logo({ variant = "full", className = "" }) {
  if (variant === "mark") {
    return <img src={logoMark} alt="Encode Studio" className={className} />;
  }
  return <img src={logoFull} alt="Encode Studio" className={className} />;
}

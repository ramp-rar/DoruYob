export default function ScanFrame({ children, className = "", ...rest }) {
  return (
    <div className={`corner-frame ${className}`} {...rest}>
      <span className="cf-tl" />
      <span className="cf-tr" />
      <span className="cf-bl" />
      <span className="cf-br" />
      {children}
    </div>
  );
}

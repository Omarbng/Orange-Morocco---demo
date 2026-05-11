/**
 * Top bar — Orange Maroc logo as the primary brand for this demo.
 */
export const TopBar: React.FC = () => {
  return (
    <header className="topbar">
      <img
        src="/orange-logo.svg"
        alt="Orange Maroc"
        className="brand-logo"
      />
    </header>
  );
};

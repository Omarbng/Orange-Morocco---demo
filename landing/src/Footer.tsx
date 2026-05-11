/**
 * Bottom-right "Powered by" pill.
 *
 * Uses an inline SVG wordmark designed for dark backgrounds — white
 * "Black" + brand-green "N" + white "Green". The original raster
 * /bng-logo.png is dark-green-on-transparent and disappears against
 * our navy/black theme; this version is built to be legible.
 */
export const Footer: React.FC = () => {
  return (
    <footer className="bng-footer" aria-label="BlackNGreen">
      <span className="bng-by">Powered by</span>
      <span className="bng-wordmark" role="img" aria-label="BlackNGreen">
        <span className="bng-wordmark-text">
          black<span className="bng-wordmark-n">N</span>green
        </span>
      </span>
    </footer>
  );
};

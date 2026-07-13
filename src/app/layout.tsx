import '../styles/router.css';
import '../styles/layer1india.css';
import '../styles/Positions_layer1_india.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

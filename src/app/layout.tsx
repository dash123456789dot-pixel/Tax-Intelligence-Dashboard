import '../styles/router.css';
import '../styles/layer1india.css';
import '../styles/Positions_layer1_india.css';
import { AuthProvider } from '../components/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

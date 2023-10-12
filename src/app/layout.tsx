import "~/styles/globals.css";
export const metadata = {
  title: "Webauthn Demo",
  description: "Webauthn Demo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

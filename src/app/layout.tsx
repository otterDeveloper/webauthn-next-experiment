import "~/styles/globals.css";
import { Providers } from "~/utils/provider";
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
			<body className="min-h-screen">
				<main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
					<div className="container mt-[5%] flex flex-col items-center justify-center  px-4 py-16 ">
						<h1 className="mb-12 text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
							<span className="text-[hsl(280,100%,70%)]">Webauthn</span> Demo
						</h1>
						<Providers>{children}</Providers>
					</div>
				</main>
			</body>
		</html>
	);
}

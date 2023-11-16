import { redirect } from "next/navigation";
import { getAuth } from "~/utils/query";
import Navbar from "../Navbar";

export default async function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const auth = await getAuth();
	if (auth === null) redirect("/");
	return (
		<>
			<Navbar />
			<div className="mt-3 min-w-[30%] rounded-[.5rem] bg-background  p-5">
				{children}
			</div>
		</>
	);
}

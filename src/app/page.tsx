import { getAuth } from "~/utils/query";
import WebAuthnLogin, { SignOutButton } from "./WebauthnLogin";
import Navbar from "./Navbar";

export default async function IndexPage() {
	const auth = await getAuth();
	return (
		<>
			{auth === null && <WebAuthnLogin />}
			{auth && (
				<>
					<Navbar />
					<div className="mt-3 min-w-[30%] rounded-[.5rem] bg-background  p-5">
						<h3>Welcome!</h3>
						<p>You are logged in as {auth.user.email}</p>
						<div className="mt-2 text-center">
							<SignOutButton />
						</div>
					</div>
				</>
			)}
		</>
	);
}

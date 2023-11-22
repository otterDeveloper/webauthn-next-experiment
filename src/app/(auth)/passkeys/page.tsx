import React from "react";
import { db } from "~/server/db";
import { getAuth } from "~/utils/query";
import { FiKey } from "react-icons/fi";
import { AddAuthenticatorButton } from "~/app/WebauthnLogin";


const PasskeyPage = async () => {
	const auth = (await getAuth())!;
	const {
		user: { id },
	} = auth;
	const passkeys = (
		await db.authenticator.findMany({
			where: { userId: id },
			select: {
				credentialID: true,
				friendlyName: true,
				credentialDeviceType: true,
				credentialBackedUp: true,
				transports: true,
				createdAt: true,
				updatedAt: true,
			},
		})
	).map((passkey) => ({
		...passkey,
		id: passkey.credentialID.toString("hex"),
	}));
	const allowDelete = passkeys.length > 1;
	return (
		<>
			<div className="grid w-full grid-cols-[.5fr_3fr_1fr] space-x-4 py-2">
				<h3 className="text-xl font-bold w-full col-span-2">Enrolled Passkeys</h3>
				<AddAuthenticatorButton/>
			</div>
			<ul className="mt-2">
				{passkeys.map((passkey) => (
					<li
						key={passkey.id}
						className="grid max-w-max grid-cols-[.5fr_3fr_1fr] space-x-4 py-2">
						<FiKey className="mt-4 h-8 w-8" />
						<div className="leading-5">
							<h4 className="font-bold">
								{passkey.friendlyName != ""
									? passkey.friendlyName
									: passkey.id.slice(0, 12)}
							</h4>
							<p>
								{passkey.credentialDeviceType} {passkey.transports.join(", ")}
							</p>
							<p>Created at: {passkey.createdAt.toLocaleDateString()}</p>
							<p>Last used: {passkey.updatedAt.toLocaleDateString()}</p>
						</div>
						<div className="flex flex-col space-y-2">
							<button
								className={`rounded bg-muted ${allowDelete ? "bg-red-800 hover:bg-red-700" : "bg-muted"} px-4 py-2 font-bold text-white`}
								disabled={!allowDelete}>
								Delete
							</button>
							<button className="rounded bg-blue-800 px-4 py-2 font-bold text-white hover:bg-blue-700">
								Rename
							</button>
						</div>
					</li>
				))}
			</ul>
		</>
	);
};

export default PasskeyPage;

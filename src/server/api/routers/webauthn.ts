import {
	generateAuthenticationOptions,
	generateRegistrationOptions
} from "@simplewebauthn/server";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

import {
	createTRPCRouter,
	publicProcedure
} from "~/server/api/trpc";

export const webauthnRouter = createTRPCRouter({
	generateRegistrationOptions: publicProcedure
		.input(
			z.object({
				email: z.string().email(),
			}),
		)
		.mutation(async ({ input: { email }, ctx: { db, env } }) => {
			const user = await db.user.findUnique({
				where: { email },
				include: { authenticators: true },
			});

			//if user exists and has authenticators, then login
			if (user?.authenticators && user.authenticators?.length > 0) {
				const authenticators = user.authenticators;
				const authenticationOptions = await generateAuthenticationOptions({
					rpID: env.RP_ID,
					userVerification: "preferred",
					allowCredentials: authenticators.map((authenticator) => ({
						id: authenticator.credentialID,
						type: "public-key",
						transports: authenticator.transports as AuthenticatorTransport[],
					})),
				});

				await db.userPendingAssertions.upsert({
					where: { userId: user.id },
					create: {
						userId: user.id,
						challenge: authenticationOptions.challenge,
						expiresAt: new Date(Date.now() + 120 * 1000),
					},
					update: {
						challenge: authenticationOptions.challenge,
						expiresAt: new Date(Date.now() + 120 * 1000),
					},
				});
				return {
					operation: "login" as const,
					options: authenticationOptions,
				};
			} else {
				const newUserId = uuidv7();
				const registrationOptions = await generateRegistrationOptions({
					rpName: "WebAuthn Demo",
					rpID: env.RP_ID,
					userName: email,
					userID: newUserId,
					attestationType: "indirect",
					timeout: 120 * 1000,
					authenticatorSelection: {
						userVerification: "preferred",
						requireResidentKey: false,
					},
				});
				const timeoutDate = new Date();
				timeoutDate.setMinutes(timeoutDate.getMinutes() + 2);
				await db.pendingAssertions.upsert({
                    where: { email },
					create: {
						email,
						challenge: registrationOptions.challenge,
						expiresAt: timeoutDate,
                        futureUserId: newUserId,
					},
                    update: {
                        challenge: registrationOptions.challenge,
                        expiresAt: timeoutDate,
                        futureUserId: newUserId,
                    },
				});
				return {
					operation: "registration" as const,
					options: registrationOptions,
				};
			}
		}),
});

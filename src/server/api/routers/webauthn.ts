import { type Prisma } from "@prisma/client";
import {
	type GenerateRegistrationOptionsOpts,
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { type RegistrationResponseJSON } from "@simplewebauthn/server/script/deps";
import { TRPCError } from "@trpc/server";
import { uuidv7 } from "uuidv7";
import { serialize } from "v8";
import { z } from "zod";

import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";

const commonRegistrationOptions = {
	rpName: "WebAuthn Demo",
	attestationType: "indirect",
	timeout: 120 * 1000,
	authenticatorSelection: {
		userVerification: "preferred",
		requireResidentKey: false,
	},
} satisfies Partial<GenerateRegistrationOptionsOpts>;

export const webauthnRouter = createTRPCRouter({
	generateRegistrationOptions: publicProcedure
		.input(
			z.object({
				operation: z.enum(["registration", "login"]),
				email: z.string().email(),
			}),
		)
		.mutation(async ({ input: { email, operation }, ctx: { db, env } }) => {
			const user = await db.user.findUnique({
				where: { email },
				include: { authenticators: true },
			});

			//if user exists and has authenticators, then login
			if (user?.authenticators && user.authenticators?.length > 0) {
				if (operation === "registration") {
					throw new TRPCError({
						code: "BAD_REQUEST",
						cause: "ALREADY_REGISTERED",
						message: "The email address is already registered.",
					});
				}
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
				if (operation === "login") {
					throw new TRPCError({
						code: "NOT_FOUND",
						cause: "NOT_REGISTERED",
						message: "The email address is not registered.",
					});
				}
				const newUserId = uuidv7();
				const registrationOptions = await generateRegistrationOptions({
					...commonRegistrationOptions,
					rpID: env.RP_ID,
					userName: email,
					userID: newUserId,
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
	getAddAuthenticatorOptions: protectedProcedure.mutation(
		async ({ ctx: { db, session, env } }) => {
			const {
				user: { id: userId, email },
			} = session;
			if (!userId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					cause: "NO_USER_ID",
					message: "No user ID associated with session.",
				});
			}
			if (!email) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					cause: "NO_EMAIL",
					message: "No email address associated with account.",
				});
			}
			const authenticators = await db.authenticator.findMany({
				where: { userId },
				select: { credentialID: true, transports: true },
			});

			const registrationOptions = await generateRegistrationOptions({
				...commonRegistrationOptions,
				rpID: env.RP_ID,
				userName: email,
				userID: userId,
				excludeCredentials: authenticators.map((authenticator) => ({
					id: authenticator.credentialID,
					type: "public-key",
					transports: authenticator.transports as AuthenticatorTransport[],
				})),
			});

			const timeoutDate = new Date();
			timeoutDate.setMinutes(timeoutDate.getMinutes() + 2);
			await db.userPendingAssertions.upsert({
				where: { userId },
				create: {
					userId,
					challenge: registrationOptions.challenge,
					expiresAt: timeoutDate,
				},
				update: {
					challenge: registrationOptions.challenge,
					expiresAt: timeoutDate,
				},
			});
			return {
				operation: "registration" as const,
				options: registrationOptions,
			};
		},
	),
	addAuthenticator: protectedProcedure
		.input(
			z.object({
				response: z.unknown(),
			}),
		)
		.mutation(async ({ input: { response }, ctx: { db, session, env } }) => {
			const {
				user: { id: userId },
			} = session;

			const pendingAssertion = await db.userPendingAssertions.findUnique({
				where: { userId, expiresAt: { gt: new Date() } },
			});
			if (!pendingAssertion) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					cause: "NO_PENDING_ASSERTION",
					message: "No pending assertion found.",
				});
			}
			//TODO: create zod schema for this
			const registrationResponse =
				response as RegistrationResponseJSON;
			try {
				const verification = await verifyRegistrationResponse({
					response: registrationResponse,
					expectedChallenge: pendingAssertion.challenge,
					expectedRPID: env.RP_ID,
					expectedOrigin: env.NEXTAUTH_URL,
				});
				const { verified, registrationInfo } = verification;

				if (!verified || !registrationInfo) {
					throw new Error("Could not verify response.");
				}
				const {
						credentialID,
						counter,
						credentialPublicKey,
						credentialBackedUp,
						credentialDeviceType,
						attestationObject,
						authenticatorExtensionResults,
						...rest
					} = registrationInfo;
				await db.authenticator.create({
					data: {
						userId,
						credentialID: Buffer.from(credentialID),
						counter,
						credentialBackedUp,
						credentialPublicKey: Buffer.from(credentialPublicKey),
						credentialDeviceType,
						transports: registrationResponse.response.transports ?? [],
						attestationObject: Buffer.from(attestationObject),
						// this is probably very bad:
						authenticatorExtensionResults: serialize(
							authenticatorExtensionResults,
						),
						metadata: rest as Prisma.InputJsonValue,
					},
				});

				
				return true;
			} catch (e) {
				console.error(e);
				throw new TRPCError({
					code: "BAD_REQUEST",
					cause: "INVALID_RESPONSE",
					message: "Could not verify response.",
				});
			} finally {
				await db.userPendingAssertions.delete({ where: { userId } });
			}
		}),
});

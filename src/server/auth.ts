import {
	getServerSession,
	type DefaultSession,
	type NextAuthOptions,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { env } from "~/env.mjs";
import superjson from "superjson";
import { db } from "~/server/db";
import { CustomPrismaAdapter } from "./CustomPrismaAdapter";
import { RegistrationResponseJSON } from "@simplewebauthn/server/script/deps";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { Prisma } from "@prisma/client";
import { deserialize, serialize } from "v8";
/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
	interface Session extends DefaultSession {
		user: DefaultSession["user"] & {
			id: string;
			// ...other properties
			// role: UserRole;
		};
	}

	// interface User {
	//   // ...other properties
	//   // role: UserRole;
	// }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authOptions: NextAuthOptions = {
	callbacks: {
		session: ({ session, user }) => ({
			...session,
			user: {
				...session.user,
				id: user.id,
			},
		}),
	},
	adapter: CustomPrismaAdapter(db),
	providers: [
		CredentialsProvider({
			id: "webauthn",
			name: "Credentials",
			async authorize(credentials, req) {
				if (!credentials) return null;
				const user = await db.user.findUnique({
					where: {
						email: credentials.email,
					},
					include: {
						authenticators: true,
					},
				});

				if (!user) {
					// registrations

					const pendingAssertion = await db.pendingAssertions.findUnique({
						where: {
							email: credentials.email,
							expiresAt: {
								gt: new Date(),
							},
						},
					});
					if (!pendingAssertion) {
						throw new Error("No pending assertion found");
					}
					const challenge = pendingAssertion.challenge;

					// TODO: pass this trough Zod
					const registrationResponse =
						superjson.parse<RegistrationResponseJSON>(credentials.payload);
					let verification;
					try {
						verification = await verifyRegistrationResponse({
							response: registrationResponse,
							expectedChallenge: challenge,
							expectedRPID: env.RP_ID,
							expectedOrigin: env.NEXTAUTH_URL,
						});
					} catch (e) {
						console.error(e);
						return null;
					}
					const { verified, registrationInfo } = verification;

					if (!verified || !registrationInfo) {
						console.error("Registration not verified");
						return null;
					}

					const userId = pendingAssertion.futureUserId;
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
					const user = await db.user.create({
						data: {
							id: userId,
							email: credentials.email,
							name: credentials.email,
							authenticators: {
								create: {
									credentialID: Buffer.from(credentialID),
									counter,
									credentialBackedUp,
									credentialPublicKey: Buffer.from(credentialPublicKey),
									credentialDeviceType,
									transports: registrationResponse.response.transports ?? [],
                  attestationObject: Buffer.from(attestationObject),
                  // this is probably very bad:
                  authenticatorExtensionResults: serialize(authenticatorExtensionResults),
                  metadata: rest as Prisma.InputJsonValue,
								},
							},
						},
					});
          await db.pendingAssertions.delete({
            where: {
              email: credentials.email,
            },
          });
          return user;
				}

				return user;
			},
			credentials: {
				email: { label: "Username", type: "email" },
				payload: { label: "Payload" },
			},
		}),
	],
};

/**
 * Returns the session object for usage with RSC
 *
 * @see https://next-auth.js.org/configuration/nextjs
 */
export const getServerAuthSession = () => {
	return getServerSession(authOptions);
};

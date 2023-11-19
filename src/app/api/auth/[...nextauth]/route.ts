import { type NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "~/server/auth";

function handler(req: NextRequest, ctx: {params: {nextauth: string[]}}) {
    // @ts-expect-error This thing is not accepting NextRequest and is expecting NextApiRequest for some reason
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return NextAuth(req,ctx, authOptions);
}

export {handler as GET, handler as POST, handler as PUT};
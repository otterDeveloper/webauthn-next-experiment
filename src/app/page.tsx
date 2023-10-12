import Link from "next/link";
import { Button } from "~/@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/@/components/ui/card";
import { Input } from "~/@/components/ui/input";
import { Label } from "~/@/components/ui/label";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "~/@/components/ui/tabs";

export default function IndexPage() {
	return (
		<main className=" flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c]">
			<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
				<h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
					<span className="text-[hsl(280,100%,70%)]">Webauthn</span> Demo
				</h1>
				<Tabs defaultValue="register" className="min-w-[30%]">
					<TabsList className="grid  w-full grid-cols-2">
						<TabsTrigger value="signin">Sign In</TabsTrigger>
						<TabsTrigger value="register">Register</TabsTrigger>
					</TabsList>
					<TabsContent value="register">
						<Card>
							<CardHeader>
								<CardTitle>Register</CardTitle>
								<CardDescription>
									Register with a passkey or a FIDO2 Security Key
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="space-y-1">
									<Label htmlFor="email">Email</Label>
									<Input id="email" type="email" />
								</div>
								<Button>Register</Button>
							</CardContent>
						</Card>
					</TabsContent>
					<TabsContent value="signin">
						<Card>
							<CardHeader>
								<CardTitle>Sign In</CardTitle>
								<CardDescription>
									Sign In with a passkey or a FIDO2 Security Key
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="space-y-1">
									<Label htmlFor="email">Email</Label>
									<Input id="email" type="email" />
								</div>
								<Button>Sign In</Button>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</main>
	);
}

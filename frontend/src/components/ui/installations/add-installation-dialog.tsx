import { pb } from "@/lib/pocketbase";
import type { NatsAuthOperatorsRecord } from "@/lib/pocketbase-types";
import { Save } from "lucide-react";
import { Button } from "../button";
import {
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../dialog";
import { Input } from "../input";
import { Label } from "../label";

interface AddInstallationDialogContentProps {
	setDialogCreateInstallationOpen: (open: boolean) => void;
	mutate: () => void;
}

export function AddInstallationDialogContent({
	setDialogCreateInstallationOpen,
	mutate,
}: AddInstallationDialogContentProps) {
	return (
		<DialogContent className="max-w-2xl">
			<form
				className="space-y-4"
				onSubmit={async (e) => {
					e.preventDefault();
					const form = e.target as HTMLFormElement;
					const url = form.querySelector<HTMLInputElement>("#url")?.value;
					const description =
						form.querySelector<HTMLInputElement>("#description")?.value;
					if (!url || !description) {
						return;
					}
					await pb
						.collection<NatsAuthOperatorsRecord>("nats_auth_operators")
						.create({
							url,
							description,
						});

					mutate();
					setDialogCreateInstallationOpen(false);
				}}
			>
				<DialogHeader>
					<DialogTitle>Add new installation</DialogTitle>
					<DialogDescription>
						Fill in URLs and a description for the new installation.
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-center space-x-2 mt-2">
					<div className="grid flex-1 gap-2">
						<Label htmlFor="url">URL</Label>
						<p className="text-sm text-gray-500">
							Enter NATS server URL(s) - comma separated
						</p>
						<Input
							id="url"
							defaultValue=""
							placeholder="nats://localhost:4222,nats://localhost:4223"
							required
						/>
					</div>
				</div>
				<div className="flex items-center space-x-2 mt-2">
					<div className="grid flex-1 gap-2">
						<Label htmlFor="description">Description</Label>
						<p className="text-sm text-gray-500">
							Enter installation description (prod, stage, etc.)
						</p>
						<Input
							id="description"
							defaultValue=""
							placeholder="prod-eu"
							required
						/>
					</div>
				</div>
				<DialogFooter className="justify-end mt-2">
					<DialogClose asChild>
						<Button type="button" variant="secondary">
							Close
						</Button>
					</DialogClose>
					<Button type="submit" className="px-3">
						<Save />
						<span>Add Installation</span>
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}

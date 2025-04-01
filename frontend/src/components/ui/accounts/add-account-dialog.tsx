import { pb } from "@/lib/pocketbase";
import { Link } from "@tanstack/react-router";
import type {
    NatsAuthAccountsRecord,
} from "@/lib/pocketbase-types";
import { Button } from "@/components/ui/button";
import {
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/multi-select-dialog";
import { getTeams } from "@/services/teams";
import { getInstallationLimits } from "@/services/limits";
import type { ExpandedNatsAuthOperatorsResponse } from "@/lib/expanded-pocketbase-types";


const FormSchema = z.object({
    name: z
        .string({
            required_error: "Please provide a name for the account.",
        })
        .min(1, "Name is required"),
    description: z
        .string({
            required_error: "Please provide a description for the account.",
        })
        .min(1, "Description is required"),
    limit: z.string().optional(),
    teams: z.array(z.string()).optional(),
});

interface AddAccountDialogContentProps {
    installationData: ExpandedNatsAuthOperatorsResponse;
    setDialogCreateAccountOpen: (open: boolean) => void;
    mutateAccounts: () => void;
}

export function AddAccountDialogContent({ setDialogCreateAccountOpen, installationData, mutateAccounts }: AddAccountDialogContentProps) {
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
	});

	const {
		data: limitsData,
		error: limitsError,
		isLoading: limitsLoading,
	} = getInstallationLimits(installationData.id);

	const {
		data: teamsData,
		error: teamsError,
		isLoading: teamsLoading,
	} = getTeams();

	if (limitsError) {
		return <div>Failed to load limits</div>;
	}
	if (limitsLoading) {
		return <div>Loading limits...</div>;
	}
	if (teamsError) {
		return <div>Failed to load teams</div>;
	}
	if (teamsLoading) {
		return <div>Loading teams...</div>;
	}

	async function onSubmit(data: z.infer<typeof FormSchema>) {
		await pb.collection<NatsAuthAccountsRecord>("nats_auth_accounts").create({
			name: data.name,
			description: data.description,
			limit: data.limit,
			operator: installationData.id,
			teams: data.teams,
		});
		toast("Account created successfully.");
		form.reset();

		mutateAccounts();
		setDialogCreateAccountOpen(false);
	}

	const availableTeams = () => {
		if (installationData?.expand.teams) {
			return installationData.expand.teams;
		}
		if (teamsData) {
			return teamsData;
		}
		return [];
	};

    return <DialogContent className="max-w-2xl">
        <Form {...form}>
            <form
                className="space-y-4"
                onSubmit={form.handleSubmit(onSubmit)}
            >
                <DialogHeader>
                    <DialogTitle>
                        Add account for installation '
                        {installationData.description}'
                    </DialogTitle>
                    <DialogDescription>
                        Fill in a name and a description for the new account.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2 mt-2">
                    <div className="grid flex-1 gap-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter account name"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        This name must be unique in this installation.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                    <div className="grid flex-1 gap-2">
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter account description"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        This description should be meaningful and
                                        concise.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                    <div className="grid flex-1 gap-2">
                        <FormField
                            control={form.control}
                            name="limit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Limit</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a limit to apply" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {limitsData?.map((limit) => (
                                                <SelectItem
                                                    key={limit.id}
                                                    value={limit.id}
                                                    className="cursor-pointer hover:bg-gray-100"
                                                >
                                                    {limit.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        You can configure your limits{" "}
                                        <Link
                                            className="text-blue-500"
                                            to="/installations/$installationId/limits"
                                            params={{
                                                installationId: installationData.id,
                                            }}
                                        >
                                            here
                                        </Link>
                                        .
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                    <div className="grid flex-1 gap-2">
                        <FormField
                            control={form.control}
                            name="teams"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Teams</FormLabel>
                                    <MultiSelect
                                        options={availableTeams().map((team) => {
                                            return {
                                                label: team.name,
                                                value: team.id,
                                            };
                                        })}
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        placeholder="Select teams with access"
                                        variant="inverted"
                                        maxCount={3}
                                    />
                                    <FormDescription>
                                        You can configure your limits{" "}
                                        <Link
                                            className="text-blue-500"
                                            to="/installations/$installationId/limits"
                                            params={{
                                                installationId: installationData.id,
                                            }}
                                        >
                                            here
                                        </Link>
                                        .
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
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
                        <span>Add Account</span>
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    </DialogContent>;
}
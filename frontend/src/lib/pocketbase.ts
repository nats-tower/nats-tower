import PocketBase from "pocketbase";

import type { TypedPocketBase } from "./pocketbase-types";
import { toast } from "sonner";

// During development, the PocketBase server is running on localhost:8090
// and the frontend is running on another port, so we need to specify the host
// But in production, the frontend is served by PocketBase itself, so we can use '/'
//
// 👉 Be sure to keep a trailing / in the baseUrl as its value is used to build
//    other URLs for images and links and those would break if the trailing / is missing
const baseUrl = import.meta.env.PROD ? "/" : "http://localhost:8099/";

export const pb = new PocketBase(baseUrl) as TypedPocketBase;

// Disable PocketBase's automatic request auto-cancellation. SWR already handles
// request deduplication and caching, and multiple hooks (e.g. the page data and
// the breadcrumb lookup) can legitimately request the same record concurrently.
// With auto-cancellation enabled those requests share an auto-generated request
// key, so one gets aborted on tab refocus revalidation and surfaces as a
// spurious "Error loading ..." state.
pb.autoCancellation(false);

interface FieldError {
	code: string;
	message: string;
}

interface ErrorResponseData {
	message?: string;
	data?: Record<string, FieldError>;
}

pb.afterSend = (response: Response, data: ErrorResponseData) => {
	if (response.status !== 200 && response.status !== 204) {
		// Example data
		// {
		//     "data": {
		//         "account": {
		//             "code": "validation_not_unique",
		//             "message": "Value must be unique."
		//         },
		//         "cluster": {
		//             "code": "validation_not_unique",
		//             "message": "Value must be unique."
		//         },
		//         "namespace": {
		//             "code": "validation_not_unique",
		//             "message": "Value must be unique."
		//         }
		//     },
		//     "message": "Failed to create record.",
		//     "status": 400
		// }

		let errorMessage = `An error occurred: ${response.status}`;

		// Add the general error message if available
		if (data?.message) {
			errorMessage = `${data.message} (${response.status})`;
		}

		// Add field-specific validation errors if available
		if (data?.data && typeof data.data === "object") {
			const fieldErrors = Object.entries<FieldError>(data.data)
				.map(([field, error]: [string, FieldError]) => {
					if (error?.message) {
						return `• ${field}: ${error.message}`;
					}
					return null;
				})
				.filter(Boolean);

			if (fieldErrors.length > 0) {
				errorMessage += `\n${fieldErrors.join("\n")}`;
			}
		}

		toast.error(errorMessage);
		console.error("Error response:", response, data);
	}
	return data;
};

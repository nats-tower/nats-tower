import {
	createContext,
	useContext,
	useState,
	useEffect,
	type ReactNode,
} from "react";

interface InstallationContextType {
	installationId: string | null;
	setInstallationId: (id: string | null) => void;
}

const InstallationContext = createContext<InstallationContextType | undefined>(
	undefined,
);

export const InstallationProvider = ({ children }: { children: ReactNode }) => {
	const [installationId, setInstallationIdState] = useState<string | null>(
		null,
	);

	// Load from localStorage on initial render
	useEffect(() => {
		const storedId = localStorage.getItem("installationId");
		if (storedId) {
			setInstallationIdState(storedId);
		}
	}, []);

	// Function to update both state and localStorage
	const setInstallationId = (id: string | null) => {
		if (id === null) {
			localStorage.removeItem("installationId");
		} else {
			localStorage.setItem("installationId", id);
		}
		setInstallationIdState(id);
	};

	return (
		<InstallationContext.Provider value={{ installationId, setInstallationId }}>
			{children}
		</InstallationContext.Provider>
	);
};

// Custom hook for using the context
export const useInstallation = () => {
	const context = useContext(InstallationContext);
	if (context === undefined) {
		throw new Error(
			"useInstallation must be used within an InstallationProvider",
		);
	}
	return context;
};

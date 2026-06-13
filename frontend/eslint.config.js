import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["dist", "src/routeTree.gen.ts"],
	},
	{
		files: ["**/*.{ts,tsx}"],
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		rules: {
			"react-hooks/rules-of-hooks": "error",
			"react-hooks/exhaustive-deps": "warn",
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					ignoreRestSiblings: true,
				},
			],
		},
	},
	{
		// shadcn/ui primitives, context providers and file-based route modules
		// intentionally co-locate components with hooks, variants, helpers or the
		// exported `Route`, so the fast-refresh rule is not meaningful here.
		files: ["src/components/**", "src/lib/**", "src/pages/**"],
		rules: {
			"react-refresh/only-export-components": "off",
		},
	},
);

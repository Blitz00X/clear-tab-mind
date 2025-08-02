# Clear Tab Mind

This project uses a focused set of UI components located in `src/components/ui`.
Only components that are imported elsewhere in the app remain:

- `badge`
- `button`
- `card`
- `input`
- `label`
- `select`
- `tabs`
- `textarea`
- `toast` / `toaster` / `sonner`
- `tooltip`

Unused components were removed to keep the bundle lean. Vite's build step tree-shakes
any code that isn't imported so only these components are shipped in production.

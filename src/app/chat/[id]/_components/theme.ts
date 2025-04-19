import * as prismThemes from "react-syntax-highlighter/dist/esm/styles/prism";

export const themeOptions = Object.entries(prismThemes).map(([key, value]) => ({
  label: key,
  value: key,
  theme: value,
}));

export const getThemeByName = (name: string) => {
  return (
    prismThemes[name as keyof typeof prismThemes] || prismThemes["vscDarkPlus"]
  );
};

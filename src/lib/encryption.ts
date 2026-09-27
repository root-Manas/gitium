export const encryptionEnabled = () =>
  ["enabled", "local-candidate"].includes(
    (process.env.GITIUM_E2EE_ENABLED || "").trim(),
  );

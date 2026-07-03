export function wireSettingsForm(options) {
  const {
    documentRef,
    requireNumberInRange,
    persistState,
    viewModel,
    setStatus
  } = options;

  const profileForm = documentRef.getElementById("profile-form");
  if (!profileForm) return;

  profileForm.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const formData = new FormData(profileForm);
      const displayName = String(formData.get("displayName") || "").trim();
      const autoLockMinutes = requireNumberInRange(formData.get("autoLockMinutes"), "autobloqueo", { min: 0, max: 120 });
      await persistState(
        {
          ...viewModel.state,
          profile: {
            ...viewModel.state.profile,
            displayName
          },
          appMeta: {
            ...viewModel.state.appMeta,
            autoLockMinutes
          }
        },
        "Ajustes guardados."
      );
    } catch (error) {
      setStatus(error.message || "No se pudieron guardar los ajustes.");
    }
  });
}

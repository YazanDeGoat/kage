const PROFILE_STORAGE_KEY = "kage.profile";

const DEFAULT_PROFILE = Object.freeze({
  nickname: "",
  avatar: null,
});

function normalizeProfile(value) {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PROFILE };
  }

  return {
    nickname:
      typeof value.nickname === "string"
        ? value.nickname.trim()
        : "",

    avatar:
      typeof value.avatar === "string" && value.avatar.length > 0
        ? value.avatar
        : null,
  };
}

export function getKageProfile() {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PROFILE };
  }

  try {
    const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);

    if (!stored) {
      return { ...DEFAULT_PROFILE };
    }

    return normalizeProfile(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveKageProfile(profile) {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PROFILE };
  }

  const normalized = normalizeProfile(profile);

  window.localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify(normalized)
  );

  return normalized;
}

export function setKageNickname(nickname) {
  const profile = getKageProfile();

  return saveKageProfile({
    ...profile,
    nickname:
      typeof nickname === "string"
        ? nickname.trim()
        : "",
  });
}

export function setKageAvatar(avatar) {
  const profile = getKageProfile();

  return saveKageProfile({
    ...profile,
    avatar:
      typeof avatar === "string" && avatar.length > 0
        ? avatar
        : null,
  });
}

export function removeKageAvatar() {
  return setKageAvatar(null);
}

export function getKageNickname() {
  return getKageProfile().nickname;
}

export function clearKageProfile() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
}
